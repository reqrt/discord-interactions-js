import type { APIInteraction } from 'discord-api-types/v10';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { createInteraction, type Interaction } from './interaction';
import { InteractionResponseType, InteractionType } from './types';
import { verifyKey } from './verify';

export interface DiscordInteractionsOptions {
	/**
	 * The application's public key, for single-bot deployments. Provide this or
	 * {@link getPublicKey}.
	 */
	publicKey?: string;
	/**
	 * Resolves the public key for a given `application_id`, for multi-tenant
	 * deployments serving many bots from one endpoint.
	 */
	getPublicKey?: (applicationId: string) => Promise<string> | string;
	/**
	 * Optionally resolves a bot token for a given `application_id`. Follow-ups
	 * authenticate via the interaction token and work without this, but a token
	 * lets handlers make additional authenticated REST calls.
	 */
	getBotToken?: (
		applicationId: string,
	) => Promise<string | undefined> | string | undefined;
	/** The route to mount the interactions endpoint on. Defaults to `/interactions`. */
	path?: string;
	/**
	 * Called for every verified, non-PING interaction with a fully constructed,
	 * reply-bound {@link Interaction}.
	 */
	onInteraction: (
		interaction: Interaction,
		reply: FastifyReply,
	) => Promise<void> | void;
}

/**
 * A Fastify plugin that verifies Discord interaction requests and dispatches
 * them to an handler. Replaces the Express `verifyKeyMiddleware` for HTTP-only,
 * gateway-less bots.
 *
 * - Preserves the raw request body (required for Ed25519 verification) via a
 *   scoped `application/json` content type parser.
 * - Verifies the signature and responds `401` automatically when invalid.
 * - Responds to `PING` (`type: 1`) automatically.
 * - In multi-tenant mode, extracts `application_id` from the body to resolve the
 *   correct public key before verifying.
 */
export const discordInteractions: FastifyPluginAsync<
	DiscordInteractionsOptions
> = async (fastify, options) => {
	const { publicKey, getPublicKey, getBotToken, onInteraction } = options;
	const path = options.path ?? '/interactions';

	if (!publicKey && !getPublicKey) {
		throw new Error(
			'[discord-interactions] You must provide either `publicKey` (single-bot) or `getPublicKey` (multi-tenant).',
		);
	}
	if (typeof onInteraction !== 'function') {
		throw new Error(
			'[discord-interactions] You must provide an `onInteraction` handler.',
		);
	}

	// Preserve the raw body as a Buffer so the signature can be verified against
	// the exact bytes Discord signed. Encapsulated to this plugin's scope, so
	// other routes in the application keep their normal JSON parsing.
	fastify.addContentTypeParser(
		'application/json',
		{ parseAs: 'buffer' },
		(_request, body, done) => {
			done(null, body);
		},
	);

	fastify.post(path, async (request, reply) => {
		const rawBody = request.body;
		const signature = headerValue(request.headers['x-signature-ed25519']);
		const timestamp = headerValue(request.headers['x-signature-timestamp']);

		if (!signature || !timestamp || !Buffer.isBuffer(rawBody)) {
			return reply.code(401).send('[discord-interactions] Invalid signature');
		}

		// Parse the (still untrusted) body first so multi-tenant deployments can
		// select the correct public key by application_id. Trust is established by
		// the signature check below, not by this parse.
		let payload: APIInteraction;
		try {
			payload = JSON.parse(rawBody.toString('utf-8'));
		} catch {
			return reply.code(401).send('[discord-interactions] Invalid body');
		}

		const applicationId = payload.application_id ?? '';

		let key: string;
		try {
			key = getPublicKey
				? await getPublicKey(applicationId)
				: (publicKey as string);
		} catch (error) {
			request.log.error(error);
			return reply.code(401).send('[discord-interactions] Unknown application');
		}
		if (!key) {
			return reply.code(401).send('[discord-interactions] Unknown application');
		}

		const isValid = await verifyKey(rawBody, signature, timestamp, key);
		if (!isValid) {
			return reply.code(401).send('[discord-interactions] Invalid signature');
		}

		// Acknowledge PING automatically.
		if ((payload.type as number) === InteractionType.PING) {
			return reply.send({ type: InteractionResponseType.PONG });
		}

		const botToken = getBotToken ? await getBotToken(applicationId) : undefined;
		const interaction = createInteraction(payload, botToken ?? undefined);
		interaction._setReply(reply);

		try {
			await onInteraction(interaction, reply);
		} catch (error) {
			request.log.error(error);
			if (!reply.sent) {
				reply.code(500).send('[discord-interactions] Handler error');
			}
		}
	});
};

function headerValue(value: string | string[] | undefined): string {
	if (Array.isArray(value)) {
		return value[0] ?? '';
	}
	return value ?? '';
}
