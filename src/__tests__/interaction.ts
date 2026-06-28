import {
	AutocompleteInteraction,
	CommandInteraction,
	ComponentInteraction,
	createInteraction,
	type Interaction,
	InteractionResponseType,
	InteractionType,
	ModalInteraction,
} from '../index';
import {
	APP_ID,
	autocompletePayload,
	buttonPayload,
	CREATED_MS,
	commandPayload,
	createMockReply,
	dmCommandPayload,
	modalPayload,
	pingPayload,
	SNOWFLAKE,
	selectPayload,
	subcommandPayload,
	TOKEN,
} from './utils/fixtures';

describe('createInteraction factory', () => {
	it('constructs the correct subclass per interaction type', () => {
		expect(createInteraction(commandPayload())).toBeInstanceOf(
			CommandInteraction,
		);
		expect(createInteraction(buttonPayload())).toBeInstanceOf(
			ComponentInteraction,
		);
		expect(createInteraction(modalPayload())).toBeInstanceOf(ModalInteraction);
		expect(createInteraction(autocompletePayload())).toBeInstanceOf(
			AutocompleteInteraction,
		);
	});
});

describe('Interaction (base)', () => {
	it('reads the common fields from the payload', () => {
		const interaction = createInteraction(commandPayload());
		expect(interaction.id).toBe(SNOWFLAKE);
		expect(interaction.application_id).toBe(APP_ID);
		expect(interaction.type).toBe(InteractionType.APPLICATION_COMMAND);
		expect(interaction.token).toBe(TOKEN);
		expect(interaction.version).toBe(1);
		expect(interaction.locale).toBe('en-US');
		expect(interaction.guild_id).toBe('111111111111111111');
		expect(interaction.channel_id).toBe('222222222222222222');
		expect(interaction.entitlements).toStrictEqual([]);
	});

	it('extracts created_at and expires_at from the snowflake id', () => {
		const interaction = createInteraction(commandPayload());
		expect(interaction.created_at.getTime()).toBe(CREATED_MS);
		expect(interaction.expires_at.getTime()).toBe(CREATED_MS + 15 * 60 * 1000);
	});

	it('resolves the user from member in guilds', () => {
		const interaction = createInteraction(commandPayload());
		expect(interaction.user.id).toBe('user-1');
		expect(interaction.member).toBeDefined();
	});

	it('resolves the user from the top level in DMs', () => {
		const interaction = createInteraction(dmCommandPayload());
		expect(interaction.user.id).toBe('user-dm');
		expect(interaction.member).toBeUndefined();
	});

	it('reports an old interaction as expired', () => {
		const interaction = createInteraction(commandPayload());
		expect(interaction.is_expired()).toBe(true);
	});

	it('send() shorthand drives the response', async () => {
		const interaction = createInteraction(commandPayload());
		const reply = createMockReply();
		interaction._setReply(reply);

		await interaction.send({ content: 'hi' });

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			data: { content: 'hi' },
		});
	});

	it('defer() shorthand drives the response', async () => {
		const interaction = createInteraction(commandPayload());
		const reply = createMockReply();
		interaction._setReply(reply);

		await interaction.defer(true);

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
			data: { flags: 64 },
		});
	});
});

describe('CommandInteraction', () => {
	it('exposes command_name and a flat option map', () => {
		const interaction = createInteraction(
			commandPayload(),
		) as CommandInteraction;
		expect(interaction.command_name).toBe('produtos');
		expect(interaction.get_option('categoria')).toBe('eletronicos');
		expect(interaction.get_option('missing')).toBeUndefined();
	});

	it('flattens subcommand option values', () => {
		const interaction = createInteraction(
			subcommandPayload(),
		) as CommandInteraction;
		expect(interaction.command_name).toBe('admin');
		expect(interaction.get_option('alvo')).toBe('user-999');
	});
});

describe('ComponentInteraction', () => {
	it('exposes custom_id and component_type for a button', () => {
		const interaction = createInteraction(
			buttonPayload('view:produto_123'),
		) as ComponentInteraction;
		expect(interaction.custom_id).toBe('view:produto_123');
		expect(interaction.component_type).toBe(2);
		expect(interaction.values).toBeUndefined();
	});

	it('exposes selected values for a select menu', () => {
		const interaction = createInteraction(
			selectPayload('pick', ['x', 'y']),
		) as ComponentInteraction;
		expect(interaction.values).toStrictEqual(['x', 'y']);
	});

	it('update() edits the message inline', async () => {
		const interaction = createInteraction(
			buttonPayload(),
		) as ComponentInteraction;
		const reply = createMockReply();
		interaction._setReply(reply);

		await interaction.update({ content: 'changed' });

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.UPDATE_MESSAGE,
			data: { content: 'changed' },
		});
	});

	it('defer_update() acknowledges silently', async () => {
		const interaction = createInteraction(
			buttonPayload(),
		) as ComponentInteraction;
		const reply = createMockReply();
		interaction._setReply(reply);

		await interaction.defer_update();

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
		});
	});
});

describe('ModalInteraction', () => {
	it('reads submitted field values by custom_id', () => {
		const interaction = createInteraction(modalPayload()) as ModalInteraction;
		expect(interaction.custom_id).toBe('checkout');
		expect(interaction.get_field('nome')).toBe('João');
		expect(interaction.get_field('email')).toBe('joao@example.com');
		expect(interaction.get_field('missing')).toBeUndefined();
	});

	it('get_field_required throws for a missing field', () => {
		const interaction = createInteraction(modalPayload()) as ModalInteraction;
		expect(() => interaction.get_field_required('missing')).toThrow(
			'Modal field "missing" is missing',
		);
	});
});

describe('AutocompleteInteraction', () => {
	it('exposes the focused option and command name', () => {
		const interaction = createInteraction(
			autocompletePayload(),
		) as AutocompleteInteraction;
		expect(interaction.command_name).toBe('produtos');
		expect(interaction.focused_option).toStrictEqual({
			name: 'categoria',
			value: 'ele',
		});
	});

	it('respond() returns autocomplete choices', async () => {
		const interaction = createInteraction(
			autocompletePayload(),
		) as AutocompleteInteraction;
		const reply = createMockReply();
		interaction._setReply(reply);

		await interaction.respond([{ name: 'Eletrônicos', value: 'ele' }]);

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
			data: { choices: [{ name: 'Eletrônicos', value: 'ele' }] },
		});
	});
});

describe('PING', () => {
	it('builds a base Interaction for unrecognized/ping types', () => {
		const interaction: Interaction = createInteraction(pingPayload());
		expect(interaction).not.toBeInstanceOf(CommandInteraction);
		expect(interaction.type).toBe(InteractionType.PING);
	});
});
