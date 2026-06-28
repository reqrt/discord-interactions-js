import type { Interaction } from './interaction';
import { buildMultipartFormData, resolveMessageData } from './message';
import {
	type AutocompleteChoice,
	InteractionResponseFlags,
	InteractionResponseType,
	type MessageOptions,
	type ModalOptions,
} from './types';

/**
 * The minimal surface of an HTTP reply needed to send an interaction response.
 * `FastifyReply` satisfies this structurally, but keeping it minimal decouples
 * the response logic from any specific web framework and keeps it testable.
 */
export interface InteractionReply {
	header(key: string, value: string): unknown;
	send(payload: unknown): unknown;
	readonly sent?: boolean;
}

interface ResponsePayload {
	type: InteractionResponseType;
	data?: unknown;
}

/**
 * Handles the single, immediate response to an interaction (the reply Discord
 * expects within 3 seconds). The response is written directly to the HTTP reply
 * that delivered the interaction. Once any response has been sent, further
 * messaging must go through {@link Interaction.followup}.
 */
export class InteractionResponse {
	private reply?: InteractionReply;
	private done = false;

	constructor(private readonly interaction: Interaction) {}

	/**
	 * Connects the HTTP reply used to deliver the response. Called internally by
	 * the framework adapter before user handlers run.
	 * @internal
	 */
	_setReply(reply: InteractionReply): void {
		this.reply = reply;
	}

	/**
	 * Whether a response has already been sent. An interaction can only be
	 * responded to once; use the follow-up methods afterwards.
	 */
	is_done(): boolean {
		return this.done;
	}

	/**
	 * `type: 1` — acknowledge a `PING`. Normally handled automatically by the
	 * framework adapter.
	 */
	async pong(): Promise<void> {
		await this.respond({ type: InteractionResponseType.PONG });
	}

	/**
	 * `type: 4` — respond immediately with a message.
	 */
	async send_message(options: MessageOptions): Promise<void> {
		const { body, files } = resolveMessageData(options);
		await this.respond(
			{ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: body },
			files,
		);
	}

	/**
	 * `type: 5` — acknowledge now and respond later ("Bot is thinking..."),
	 * unlocking the 15-minute follow-up window.
	 */
	async defer(ephemeral?: boolean): Promise<void> {
		await this.respond({
			type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
			data: ephemeral
				? { flags: InteractionResponseFlags.EPHEMERAL }
				: undefined,
		});
	}

	/**
	 * `type: 6` — acknowledge a component interaction without a visible loading
	 * state, to edit the message later via follow-up.
	 */
	async defer_update(): Promise<void> {
		await this.respond({
			type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
		});
	}

	/**
	 * `type: 7` — edit the message the component was attached to, inline.
	 */
	async edit_message(options: MessageOptions): Promise<void> {
		const { body, files } = resolveMessageData(options);
		await this.respond(
			{ type: InteractionResponseType.UPDATE_MESSAGE, data: body },
			files,
		);
	}

	/**
	 * `type: 8` — return autocomplete choices.
	 */
	async autocomplete(choices: AutocompleteChoice[]): Promise<void> {
		await this.respond({
			type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
			data: { choices },
		});
	}

	/**
	 * `type: 9` — open a modal.
	 */
	async send_modal(modal: ModalOptions): Promise<void> {
		await this.respond({
			type: InteractionResponseType.MODAL,
			data: {
				custom_id: modal.custom_id,
				title: modal.title,
				components: modal.components,
			},
		});
	}

	/**
	 * `type: 10` — prompt the user to upgrade (premium upsell).
	 */
	async require_premium(): Promise<void> {
		await this.respond({ type: InteractionResponseType.PREMIUM_REQUIRED });
	}

	private async respond(
		payload: ResponsePayload,
		files?: ReturnType<typeof resolveMessageData>['files'],
	): Promise<void> {
		if (this.done) {
			throw new Error(
				'Already responded to this interaction. Use followup instead.',
			);
		}
		const reply = this.ensureReply();
		this.done = true;

		if (files && files.length > 0) {
			const { body, contentType } = buildMultipartFormData(payload, files);
			reply.header('content-type', contentType);
			await reply.send(body);
			return;
		}

		await reply.send(payload);
	}

	private ensureReply(): InteractionReply {
		if (!this.reply) {
			throw new Error(
				`Cannot send a response: interaction ${this.interaction.id} is not connected to an HTTP reply.`,
			);
		}
		return this.reply;
	}
}
