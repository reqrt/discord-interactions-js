import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyleTypes,
	EmbedBuilder,
	MessageComponentTypes,
	StringSelectBuilder,
	TextInputBuilder,
	TextStyleTypes,
} from '../index';

describe('ButtonBuilder', () => {
	it('builds a custom button (happy path)', () => {
		const button = new ButtonBuilder()
			.setLabel('Ver Produto')
			.setCustomId('view:produto_123')
			.setStyle(ButtonStyleTypes.PRIMARY)
			.toJSON();

		expect(button).toStrictEqual({
			type: MessageComponentTypes.BUTTON,
			style: ButtonStyleTypes.PRIMARY,
			label: 'Ver Produto',
			custom_id: 'view:produto_123',
		});
	});

	it('builds a link button', () => {
		const button = new ButtonBuilder()
			.setLabel('Docs')
			.setStyle(ButtonStyleTypes.LINK)
			.setUrl('https://discord.dev')
			.toJSON();

		expect(button).toStrictEqual({
			type: MessageComponentTypes.BUTTON,
			style: ButtonStyleTypes.LINK,
			label: 'Docs',
			url: 'https://discord.dev',
		});
	});

	it('throws when a link button has no url', () => {
		expect(() =>
			new ButtonBuilder()
				.setLabel('Docs')
				.setStyle(ButtonStyleTypes.LINK)
				.toJSON(),
		).toThrow('A LINK button requires a url');
	});

	it('throws when a custom button has no custom_id', () => {
		expect(() => new ButtonBuilder().setLabel('Oops').toJSON()).toThrow(
			'requires a custom_id',
		);
	});

	it('throws when neither label nor emoji is set', () => {
		expect(() => new ButtonBuilder().setCustomId('x').toJSON()).toThrow(
			'requires a label or an emoji',
		);
	});
});

describe('StringSelectBuilder', () => {
	it('builds a select with options', () => {
		const select = new StringSelectBuilder()
			.setCustomId('pick')
			.setPlaceholder('Choose')
			.setMinValues(1)
			.setMaxValues(2)
			.addOption({ label: 'A', value: 'a' })
			.addOption({ label: 'B', value: 'b' })
			.toJSON();

		expect(select).toStrictEqual({
			type: MessageComponentTypes.STRING_SELECT,
			custom_id: 'pick',
			placeholder: 'Choose',
			min_values: 1,
			max_values: 2,
			options: [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
			],
		});
	});

	it('throws without a custom_id', () => {
		expect(() => new StringSelectBuilder().toJSON()).toThrow(
			'requires a custom_id',
		);
	});
});

describe('TextInputBuilder', () => {
	it('builds a paragraph text input', () => {
		const input = new TextInputBuilder()
			.setCustomId('feedback')
			.setLabel('Your feedback')
			.setStyle('PARAGRAPH')
			.setRequired()
			.setMaxLength(500)
			.toJSON();

		expect(input).toStrictEqual({
			type: MessageComponentTypes.INPUT_TEXT,
			custom_id: 'feedback',
			style: TextStyleTypes.PARAGRAPH,
			label: 'Your feedback',
			required: true,
			max_length: 500,
		});
	});

	it('defaults to SHORT style', () => {
		const input = new TextInputBuilder().setCustomId('name').toJSON();
		expect(input.style).toBe(TextStyleTypes.SHORT);
	});
});

describe('ActionRowBuilder', () => {
	it('wraps components', () => {
		const button = new ButtonBuilder()
			.setLabel('Go')
			.setCustomId('go')
			.toJSON();
		const row = new ActionRowBuilder().addComponent(button).toJSON();

		expect(row).toStrictEqual({
			type: MessageComponentTypes.ACTION_ROW,
			components: [button],
		});
	});
});

describe('EmbedBuilder', () => {
	it('builds an embed (happy path)', () => {
		const embed = new EmbedBuilder()
			.setTitle('Nossos Produtos')
			.setDescription('Escolha um produto')
			.setColor(0x5865f2)
			.addField('Estoque', '12', true)
			.setFooter('Loja', 'https://cdn/icon.png')
			.toJSON();

		expect(embed).toStrictEqual({
			title: 'Nossos Produtos',
			description: 'Escolha um produto',
			color: 0x5865f2,
			fields: [{ name: 'Estoque', value: '12', inline: true }],
			footer: { text: 'Loja', icon_url: 'https://cdn/icon.png' },
		});
	});

	it('serializes a provided timestamp as ISO 8601', () => {
		const date = new Date('2026-06-28T00:00:00.000Z');
		const embed = new EmbedBuilder().setTimestamp(date).toJSON();
		expect(embed.timestamp).toBe('2026-06-28T00:00:00.000Z');
	});
});
