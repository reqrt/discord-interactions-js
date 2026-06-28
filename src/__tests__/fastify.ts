import Fastify, { type FastifyInstance } from 'fastify';
import {
	type DiscordInteractionsOptions,
	discordInteractions,
	type Interaction,
} from '../index';
import { subtleCrypto } from '../util';
import { APP_ID, commandPayload, pingPayload } from './utils/fixtures';
import {
	generateKeyPair,
	signRequestWithKeyPair,
} from './utils/SharedTestUtils';

let validKeyPair: CryptoKeyPair;
let invalidKeyPair: CryptoKeyPair;
let publicKeyHex: string;

beforeAll(async () => {
	validKeyPair = await generateKeyPair();
	invalidKeyPair = await generateKeyPair();
	publicKeyHex = Buffer.from(
		await subtleCrypto.exportKey('raw', validKeyPair.publicKey),
	).toString('hex');
});

async function buildApp(
	options: DiscordInteractionsOptions,
): Promise<FastifyInstance> {
	const app = Fastify();
	await app.register(discordInteractions, options);
	await app.ready();
	return app;
}

async function signedHeaders(body: string, key = validKeyPair.privateKey) {
	const signed = await signRequestWithKeyPair(body, key);
	return {
		'x-signature-ed25519': signed.signature,
		'x-signature-timestamp': signed.timestamp,
		'content-type': 'application/json',
	};
}

describe('discordInteractions plugin', () => {
	it('responds to PING automatically with type 1', async () => {
		const onInteraction = jest.fn<Promise<void>, [Interaction]>();
		const app = await buildApp({ publicKey: publicKeyHex, onInteraction });
		const body = JSON.stringify(pingPayload());

		const res = await app.inject({
			method: 'POST',
			url: '/interactions',
			headers: await signedHeaders(body),
			payload: body,
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toStrictEqual({ type: 1 });
		expect(onInteraction).not.toHaveBeenCalled();
		await app.close();
	});

	it('verifies and dispatches a command to onInteraction', async () => {
		const app = await buildApp({
			publicKey: publicKeyHex,
			onInteraction: async (interaction) => {
				await interaction.response.send_message({ content: 'Hello world' });
			},
		});
		const body = JSON.stringify(commandPayload());

		const res = await app.inject({
			method: 'POST',
			url: '/interactions',
			headers: await signedHeaders(body),
			payload: body,
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toStrictEqual({
			type: 4,
			data: { content: 'Hello world' },
		});
		await app.close();
	});

	it('rejects an invalid signature with 401', async () => {
		const onInteraction = jest.fn<Promise<void>, [Interaction]>();
		const app = await buildApp({ publicKey: publicKeyHex, onInteraction });
		const body = JSON.stringify(commandPayload());

		const res = await app.inject({
			method: 'POST',
			url: '/interactions',
			headers: await signedHeaders(body, invalidKeyPair.privateKey),
			payload: body,
		});

		expect(res.statusCode).toBe(401);
		expect(onInteraction).not.toHaveBeenCalled();
		await app.close();
	});

	it('rejects a request missing signature headers with 401', async () => {
		const app = await buildApp({
			publicKey: publicKeyHex,
			onInteraction: jest.fn(),
		});
		const body = JSON.stringify(commandPayload());

		const res = await app.inject({
			method: 'POST',
			url: '/interactions',
			headers: { 'content-type': 'application/json' },
			payload: body,
		});

		expect(res.statusCode).toBe(401);
		await app.close();
	});

	it('uses getPublicKey for multi-tenant verification', async () => {
		const getPublicKey = jest.fn(async () => publicKeyHex);
		const onInteraction = jest.fn<Promise<void>, [Interaction]>(
			async (interaction) => {
				await interaction.response.defer();
			},
		);
		const app = await buildApp({ getPublicKey, onInteraction });
		const body = JSON.stringify(commandPayload());

		const res = await app.inject({
			method: 'POST',
			url: '/interactions',
			headers: await signedHeaders(body),
			payload: body,
		});

		expect(res.statusCode).toBe(200);
		expect(getPublicKey).toHaveBeenCalledWith(APP_ID);
		expect(onInteraction).toHaveBeenCalledTimes(1);
		await app.close();
	});

	it('rejects an unknown application (empty key) with 401', async () => {
		const getPublicKey = jest.fn(async () => '');
		const onInteraction = jest.fn<Promise<void>, [Interaction]>();
		const app = await buildApp({ getPublicKey, onInteraction });
		const body = JSON.stringify(commandPayload());

		const res = await app.inject({
			method: 'POST',
			url: '/interactions',
			headers: await signedHeaders(body),
			payload: body,
		});

		expect(res.statusCode).toBe(401);
		expect(onInteraction).not.toHaveBeenCalled();
		await app.close();
	});

	it('passes the bot token from getBotToken to handlers', async () => {
		const getBotToken = jest.fn(async () => 'bot-token-xyz');
		const app = await buildApp({
			publicKey: publicKeyHex,
			getBotToken,
			onInteraction: async (interaction) => {
				await interaction.response.send_message({ content: 'ok' });
			},
		});
		const body = JSON.stringify(commandPayload());

		const res = await app.inject({
			method: 'POST',
			url: '/interactions',
			headers: await signedHeaders(body),
			payload: body,
		});

		expect(res.statusCode).toBe(200);
		expect(getBotToken).toHaveBeenCalledWith(APP_ID);
		await app.close();
	});

	it('does not leak its raw-body parser to other routes (encapsulation)', async () => {
		const app = Fastify();
		await app.register(discordInteractions, {
			publicKey: publicKeyHex,
			onInteraction: jest.fn(),
		});
		app.post('/normal', async (request) => {
			// Outside the plugin scope, JSON is parsed normally into an object.
			return { received: request.body };
		});
		await app.ready();

		const res = await app.inject({
			method: 'POST',
			url: '/normal',
			headers: { 'content-type': 'application/json' },
			payload: JSON.stringify({ hello: 'world' }),
		});

		expect(res.json()).toStrictEqual({ received: { hello: 'world' } });
		await app.close();
	});

	it('throws at registration when no public key option is provided', async () => {
		const app = Fastify();
		await expect(
			app
				.register(discordInteractions, {
					onInteraction: jest.fn(),
				} as unknown as DiscordInteractionsOptions)
				.ready(),
		).rejects.toThrow('publicKey');
		await app.close();
	});
});
