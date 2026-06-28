import type { REST } from '@discordjs/rest';
import type { APIMessage, Snowflake } from 'discord-api-types/v10';
import { Routes } from 'discord-api-types/v10';
import { resolveMessageData } from './message';
import type { MessageOptions } from './types';

/**
 * Sends follow-up messages for an interaction after the initial response, using
 * the interaction token's webhook endpoints. The token is valid for 15 minutes
 * from when the interaction was received.
 *
 * Interaction webhook endpoints authenticate via the token in the URL, so these
 * requests are made with `auth: false` and work even when the underlying REST
 * client has no bot token configured.
 */
export class InteractionFollowup {
	constructor(
		private readonly applicationId: Snowflake,
		private readonly token: string,
		private readonly rest: REST,
	) {}

	/**
	 * Creates a new follow-up message.
	 * `POST /webhooks/{application_id}/{token}`
	 */
	async send(options: MessageOptions): Promise<APIMessage> {
		const { body, files } = resolveMessageData(options);
		return (await this.rest.post(
			Routes.webhook(this.applicationId, this.token),
			{ body, files, auth: false },
		)) as APIMessage;
	}

	/**
	 * Edits the original interaction response (the "Bot is thinking..." message
	 * after a defer).
	 * `PATCH /webhooks/{application_id}/{token}/messages/@original`
	 */
	async edit(options: MessageOptions): Promise<APIMessage> {
		return this.edit_message('@original', options);
	}

	/**
	 * Deletes the original interaction response.
	 * `DELETE /webhooks/{application_id}/{token}/messages/@original`
	 */
	async delete(): Promise<void> {
		await this.delete_message('@original');
	}

	/**
	 * Fetches the original interaction response.
	 * `GET /webhooks/{application_id}/{token}/messages/@original`
	 */
	async fetch(): Promise<APIMessage> {
		return this.fetch_message('@original');
	}

	/**
	 * Edits a specific follow-up message by id.
	 * `PATCH /webhooks/{application_id}/{token}/messages/{message_id}`
	 */
	async edit_message(
		messageId: Snowflake,
		options: MessageOptions,
	): Promise<APIMessage> {
		const { body, files } = resolveMessageData(options);
		return (await this.rest.patch(
			Routes.webhookMessage(this.applicationId, this.token, messageId),
			{ body, files, auth: false },
		)) as APIMessage;
	}

	/**
	 * Deletes a specific follow-up message by id.
	 * `DELETE /webhooks/{application_id}/{token}/messages/{message_id}`
	 */
	async delete_message(messageId: Snowflake): Promise<void> {
		await this.rest.delete(
			Routes.webhookMessage(this.applicationId, this.token, messageId),
			{ auth: false },
		);
	}

	/**
	 * Fetches a specific follow-up message by id.
	 * `GET /webhooks/{application_id}/{token}/messages/{message_id}`
	 */
	async fetch_message(messageId: Snowflake): Promise<APIMessage> {
		return (await this.rest.get(
			Routes.webhookMessage(this.applicationId, this.token, messageId),
			{ auth: false },
		)) as APIMessage;
	}
}
