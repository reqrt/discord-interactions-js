import type { REST } from '@discordjs/rest';
import type { APIInteraction } from 'discord-api-types/v10';
import type { InteractionReply } from '../../response';

/** A real Discord snowflake → 2020-12-11T20:27:57.125Z. */
export const SNOWFLAKE = '787053080478613555';
export const CREATED_MS = 1607718477125;
export const APP_ID = '123456789012345678';
export const TOKEN = 'interaction-token-from-discord';

type Overrides = Record<string, unknown>;

function base(overrides: Overrides): Record<string, unknown> {
	return {
		id: SNOWFLAKE,
		application_id: APP_ID,
		token: TOKEN,
		version: 1,
		locale: 'en-US',
		guild_id: '111111111111111111',
		channel_id: '222222222222222222',
		app_permissions: '0',
		entitlements: [],
		member: { user: { id: 'user-1', username: 'alice' } },
		...overrides,
	};
}

export function commandPayload(overrides: Overrides = {}): APIInteraction {
	return base({
		type: 2,
		data: {
			id: 'command-1',
			name: 'produtos',
			type: 1,
			options: [{ type: 3, name: 'categoria', value: 'eletronicos' }],
		},
		...overrides,
	}) as unknown as APIInteraction;
}

export function subcommandPayload(): APIInteraction {
	return base({
		type: 2,
		data: {
			id: 'command-2',
			name: 'admin',
			type: 1,
			options: [
				{
					type: 1, // SUB_COMMAND
					name: 'ban',
					options: [{ type: 6, name: 'alvo', value: 'user-999' }],
				},
			],
		},
	}) as unknown as APIInteraction;
}

export function buttonPayload(customId = 'view:produto_123'): APIInteraction {
	return base({
		type: 3,
		data: { custom_id: customId, component_type: 2 },
	}) as unknown as APIInteraction;
}

export function selectPayload(
	customId = 'pick',
	values: string[] = ['a', 'b'],
): APIInteraction {
	return base({
		type: 3,
		data: { custom_id: customId, component_type: 3, values },
	}) as unknown as APIInteraction;
}

export function modalPayload(customId = 'checkout'): APIInteraction {
	return base({
		type: 5,
		data: {
			custom_id: customId,
			components: [
				{
					type: 1,
					components: [
						{ type: 4, custom_id: 'nome', value: 'João' },
						{ type: 4, custom_id: 'email', value: 'joao@example.com' },
					],
				},
			],
		},
	}) as unknown as APIInteraction;
}

export function autocompletePayload(commandName = 'produtos'): APIInteraction {
	return base({
		type: 4,
		data: {
			id: 'command-1',
			name: commandName,
			type: 1,
			options: [{ type: 3, name: 'categoria', value: 'ele', focused: true }],
		},
	}) as unknown as APIInteraction;
}

export function dmCommandPayload(): APIInteraction {
	return {
		id: SNOWFLAKE,
		application_id: APP_ID,
		token: TOKEN,
		version: 1,
		entitlements: [],
		// No member; DM interactions carry `user` at the top level.
		user: { id: 'user-dm', username: 'bob' },
		type: 2,
		data: { id: 'command-1', name: 'ping', type: 1 },
	} as unknown as APIInteraction;
}

export function pingPayload(): APIInteraction {
	return {
		id: SNOWFLAKE,
		application_id: APP_ID,
		token: TOKEN,
		version: 1,
		type: 1,
	} as unknown as APIInteraction;
}

/** A jest-backed reply that records the last sent payload and headers. */
export interface MockReply extends InteractionReply {
	send: jest.Mock;
	header: jest.Mock;
	sent: boolean;
	headers: Record<string, string>;
}

export function createMockReply(): MockReply {
	const headers: Record<string, string> = {};
	const reply: MockReply = {
		headers,
		sent: false,
		header: jest.fn((key: string, value: string) => {
			headers[key] = value;
			return reply;
		}),
		send: jest.fn((_payload: unknown) => {
			reply.sent = true;
			return reply;
		}),
	};
	return reply;
}

/** A jest-backed REST stub exposing the verbs the library uses. */
export interface MockRest {
	post: jest.Mock;
	patch: jest.Mock;
	get: jest.Mock;
	delete: jest.Mock;
}

export function createMockRest(returnValue: unknown = { id: 'message-1' }): {
	rest: REST;
	mock: MockRest;
} {
	const mock: MockRest = {
		post: jest.fn().mockResolvedValue(returnValue),
		patch: jest.fn().mockResolvedValue(returnValue),
		get: jest.fn().mockResolvedValue(returnValue),
		delete: jest.fn().mockResolvedValue(undefined),
	};
	return { rest: mock as unknown as REST, mock };
}
