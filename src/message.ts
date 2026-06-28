import type { RawFile } from '@discordjs/rest';
import {
	type AllowedMentions,
	type AttachmentOptions,
	type EmbedOptions,
	InteractionResponseFlags,
	type MessageOptions,
	type TopLevelComponent,
} from './types';

/**
 * The JSON shape sent to Discord for creating or editing a message. This is a
 * structural subset of the API's message payload and is serialized directly.
 */
export interface ResolvedMessagePayload {
	content?: string;
	embeds?: EmbedOptions[];
	components?: TopLevelComponent[];
	flags?: number;
	allowed_mentions?: AllowedMentions;
	attachments?: Array<{ id: number; filename?: string; description?: string }>;
}

/**
 * The result of resolving {@link MessageOptions} into a wire payload plus any
 * files that must be uploaded as multipart form-data.
 */
export interface ResolvedMessage {
	body: ResolvedMessagePayload;
	files?: RawFile[];
}

/**
 * Normalizes high-level {@link MessageOptions} into the JSON body Discord
 * expects, folding the `ephemeral` shorthand into `flags` and splitting
 * attachments into uploadable files plus their metadata entries.
 */
export function resolveMessageData(options: MessageOptions): ResolvedMessage {
	let flags = options.flags ?? 0;
	if (options.ephemeral) {
		flags |= InteractionResponseFlags.EPHEMERAL;
	}
	if (options.componentsV2) {
		flags |= InteractionResponseFlags.IS_COMPONENTS_V2;
	}

	const body: ResolvedMessagePayload = {};
	if (options.content !== undefined) {
		body.content = options.content;
	}
	if (options.embeds !== undefined) {
		body.embeds = options.embeds;
	}
	if (options.components !== undefined) {
		body.components = options.components;
	}
	if (options.allowed_mentions !== undefined) {
		body.allowed_mentions = options.allowed_mentions;
	}
	if (flags !== 0) {
		body.flags = flags;
	}

	let files: RawFile[] | undefined;
	if (options.attachments && options.attachments.length > 0) {
		files = options.attachments.map((attachment: AttachmentOptions) => ({
			name: attachment.name,
			data: attachment.data,
			contentType: attachment.contentType,
		}));
		body.attachments = options.attachments.map((attachment, index) => ({
			id: index,
			filename: attachment.name,
			description: attachment.description,
		}));
	}

	return { body, files };
}

let boundaryCounter = 0;

/**
 * Builds a `multipart/form-data` body for an interaction callback that includes
 * file uploads. Discord expects the JSON callback under the `payload_json`
 * field and each file under `files[n]`, matching the attachment metadata ids.
 *
 * Used for the initial interaction response (sent directly over the HTTP reply
 * rather than through the REST client, which handles multipart on its own).
 */
export function buildMultipartFormData(
	payload: unknown,
	files: RawFile[],
): { body: Buffer; contentType: string } {
	boundaryCounter = (boundaryCounter + 1) % Number.MAX_SAFE_INTEGER;
	const boundary = `----discord-interactions-${Date.now().toString(16)}-${boundaryCounter}`;
	const chunks: Buffer[] = [];

	const pushPart = (headers: string, data: Buffer) => {
		chunks.push(Buffer.from(`--${boundary}\r\n${headers}\r\n\r\n`, 'utf-8'));
		chunks.push(data);
		chunks.push(Buffer.from('\r\n', 'utf-8'));
	};

	pushPart(
		'Content-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json',
		Buffer.from(JSON.stringify(payload), 'utf-8'),
	);

	files.forEach((file, index) => {
		const key = file.key ?? `files[${index}]`;
		const headerLines = [
			`Content-Disposition: form-data; name="${key}"; filename="${file.name}"`,
			`Content-Type: ${file.contentType ?? 'application/octet-stream'}`,
		];
		pushPart(headerLines.join('\r\n'), toBuffer(file.data));
	});

	chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf-8'));

	return {
		body: Buffer.concat(chunks),
		contentType: `multipart/form-data; boundary=${boundary}`,
	};
}

function toBuffer(data: RawFile['data']): Buffer {
	if (Buffer.isBuffer(data)) {
		return data;
	}
	if (data instanceof Uint8Array) {
		return Buffer.from(data);
	}
	if (typeof data === 'string') {
		return Buffer.from(data, 'utf-8');
	}
	// numbers / booleans are not valid file payloads in practice, but RawFile's
	// type permits them; coerce defensively rather than throwing.
	return Buffer.from(String(data), 'utf-8');
}
