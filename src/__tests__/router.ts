import type { APIInteraction } from 'discord-api-types/v10';
import {
	type ComponentInteraction,
	createInteraction,
	InteractionResponseType,
	InteractionRouter,
} from '../index';
import {
	autocompletePayload,
	buttonPayload,
	commandPayload,
	createMockReply,
	modalPayload,
} from './utils/fixtures';

function wired(payload: APIInteraction) {
	const interaction = createInteraction(payload);
	const reply = createMockReply();
	interaction._setReply(reply);
	return { interaction, reply };
}

describe('InteractionRouter', () => {
	it('routes slash commands by name', async () => {
		const handler = jest.fn();
		const router = new InteractionRouter().command('produtos', handler);
		const { interaction } = wired(commandPayload());

		await router.handle(interaction);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(interaction);
	});

	it('routes components by exact custom_id', async () => {
		const handler = jest.fn();
		const router = new InteractionRouter().component(
			'view:produto_123',
			handler,
		);
		const { interaction } = wired(buttonPayload('view:produto_123'));

		await router.handle(interaction);

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('routes components by prefix for dynamic ids', async () => {
		const seen: string[] = [];
		const router = new InteractionRouter().component_prefix(
			'buy:',
			async (interaction: ComponentInteraction) => {
				seen.push(interaction.custom_id);
			},
		);
		const { interaction } = wired(buttonPayload('buy:produto_999'));

		await router.handle(interaction);

		expect(seen).toStrictEqual(['buy:produto_999']);
	});

	it('prefers an exact component match over a prefix match', async () => {
		const exact = jest.fn();
		const prefix = jest.fn();
		const router = new InteractionRouter()
			.component('buy:special', exact)
			.component_prefix('buy:', prefix);
		const { interaction } = wired(buttonPayload('buy:special'));

		await router.handle(interaction);

		expect(exact).toHaveBeenCalledTimes(1);
		expect(prefix).not.toHaveBeenCalled();
	});

	it('routes modals by custom_id', async () => {
		const handler = jest.fn();
		const router = new InteractionRouter().modal('checkout', handler);
		const { interaction } = wired(modalPayload('checkout'));

		await router.handle(interaction);

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('routes autocomplete by command name', async () => {
		const handler = jest.fn();
		const router = new InteractionRouter().autocomplete('produtos', handler);
		const { interaction } = wired(autocompletePayload('produtos'));

		await router.handle(interaction);

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('calls the fallback handler when nothing matches', async () => {
		const fallback = jest.fn();
		const router = new InteractionRouter().fallback(fallback);
		const { interaction } = wired(commandPayload());

		await router.handle(interaction);

		expect(fallback).toHaveBeenCalledWith(interaction);
	});

	it('sends a default ephemeral error when unmatched with no fallback', async () => {
		const router = new InteractionRouter();
		const { interaction, reply } = wired(commandPayload());

		await router.handle(interaction);

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			data: {
				content: 'This interaction could not be handled.',
				flags: 64,
			},
		});
	});

	it('responds with empty choices for unmatched autocomplete', async () => {
		const router = new InteractionRouter();
		const { interaction, reply } = wired(autocompletePayload('unknown'));

		await router.handle(interaction);

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
			data: { choices: [] },
		});
	});

	it('catches handler errors without crashing and sends an error reply', async () => {
		const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		const router = new InteractionRouter().command('produtos', async () => {
			throw new Error('boom');
		});
		const { interaction, reply } = wired(commandPayload());

		await expect(router.handle(interaction)).resolves.toBeUndefined();

		expect(errorSpy).toHaveBeenCalled();
		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			data: {
				content: 'Something went wrong while handling this interaction.',
				flags: 64,
			},
		});
		errorSpy.mockRestore();
	});

	it('does not attempt a second reply if the handler already responded', async () => {
		const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		const router = new InteractionRouter().command(
			'produtos',
			async (interaction) => {
				await interaction.response.send_message({ content: 'done' });
				throw new Error('after-response failure');
			},
		);
		const { interaction, reply } = wired(commandPayload());

		await router.handle(interaction);

		// One successful send; the post-response error must not trigger a retry.
		expect(reply.send).toHaveBeenCalledTimes(1);
		expect(errorSpy).toHaveBeenCalled();
		errorSpy.mockRestore();
	});

	it('accepts a custom logger and uses it for handler errors', async () => {
		const mockLogger = { error: jest.fn() };
		const router = new InteractionRouter({ logger: mockLogger }).command(
			'produtos',
			async () => {
				throw new Error('boom');
			},
		);
		const { interaction } = wired(commandPayload());

		await router.handle(interaction);

		expect(mockLogger.error).toHaveBeenCalled();
	});
});
