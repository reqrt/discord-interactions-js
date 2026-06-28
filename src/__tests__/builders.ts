import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyleTypes,
	ContainerBuilder,
	EmbedBuilder,
	FileComponentBuilder,
	InteractionResponseFlags,
	MediaGalleryBuilder,
	MessageComponentTypes,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingTypes,
	StringSelectBuilder,
	TextDisplayBuilder,
	TextInputBuilder,
	TextStyleTypes,
	ThumbnailBuilder,
} from '../index';
import { resolveMessageData } from '../message';

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

describe('TextDisplayBuilder', () => {
	it('builds a text display (happy path)', () => {
		const td = new TextDisplayBuilder().setContent('Hello **world**').toJSON();
		expect(td).toStrictEqual({
			type: MessageComponentTypes.TEXT_DISPLAY,
			content: 'Hello **world**',
		});
	});

	it('includes an optional numeric id', () => {
		const td = new TextDisplayBuilder().setContent('x').setId(7).toJSON();
		expect(td.id).toBe(7);
	});
});

describe('SeparatorBuilder', () => {
	it('builds a separator with divider and spacing', () => {
		const sep = new SeparatorBuilder()
			.setDivider(true)
			.setSpacing(SeparatorSpacingTypes.LARGE)
			.toJSON();
		expect(sep).toStrictEqual({
			type: MessageComponentTypes.SEPARATOR,
			divider: true,
			spacing: SeparatorSpacingTypes.LARGE,
		});
	});

	it('defaults the divider to true', () => {
		const sep = new SeparatorBuilder().setDivider().toJSON();
		expect(sep.divider).toBe(true);
	});

	it('omits optional fields when unset', () => {
		const sep = new SeparatorBuilder().toJSON();
		expect(sep).toStrictEqual({ type: MessageComponentTypes.SEPARATOR });
	});
});

describe('ThumbnailBuilder', () => {
	it('builds a thumbnail (happy path)', () => {
		const thumb = new ThumbnailBuilder()
			.setUrl('https://example.com/img.png')
			.setDescription('an image')
			.setSpoiler()
			.toJSON();
		expect(thumb).toStrictEqual({
			type: MessageComponentTypes.THUMBNAIL,
			media: { url: 'https://example.com/img.png' },
			description: 'an image',
			spoiler: true,
		});
	});
});

describe('SectionBuilder', () => {
	it('builds a valid section', () => {
		const text = new TextDisplayBuilder().setContent('Hello').toJSON();
		const thumb = new ThumbnailBuilder()
			.setUrl('https://example.com/img.png')
			.toJSON();
		const section = new SectionBuilder()
			.addTextDisplay(text)
			.setAccessory(thumb)
			.toJSON();
		expect(section.type).toBe(MessageComponentTypes.SECTION);
		expect(section.components).toHaveLength(1);
		expect(section.accessory).toEqual(thumb);
	});

	it('accepts a button accessory', () => {
		const text = new TextDisplayBuilder().setContent('Hello').toJSON();
		const button = new ButtonBuilder()
			.setLabel('Go')
			.setCustomId('go')
			.toJSON();
		const section = new SectionBuilder()
			.addTextDisplay(text)
			.setAccessory(button)
			.toJSON();
		expect(section.accessory).toEqual(button);
	});

	it('throws when accessory is missing', () => {
		const builder = new SectionBuilder().addTextDisplay(
			new TextDisplayBuilder().setContent('x').toJSON(),
		);
		expect(() => builder.toJSON()).toThrow('accessory');
	});

	it('throws when no text displays are added', () => {
		const builder = new SectionBuilder().setAccessory(
			new ThumbnailBuilder().setUrl('https://example.com/img.png').toJSON(),
		);
		expect(() => builder.toJSON()).toThrow('between 1 and 3');
	});

	it('throws when more than 3 text displays are added', () => {
		const builder = new SectionBuilder().setAccessory(
			new ThumbnailBuilder().setUrl('https://example.com/img.png').toJSON(),
		);
		for (let i = 0; i < 4; i++) {
			builder.addTextDisplay(
				new TextDisplayBuilder().setContent(`text ${i}`).toJSON(),
			);
		}
		expect(() => builder.toJSON()).toThrow();
	});
});

describe('MediaGalleryBuilder', () => {
	it('builds a gallery from items', () => {
		const gallery = new MediaGalleryBuilder()
			.addItem({ media: { url: 'https://example.com/a.png' } })
			.addItems([
				{ media: { url: 'https://example.com/b.png' }, description: 'b' },
			])
			.toJSON();
		expect(gallery.type).toBe(MessageComponentTypes.MEDIA_GALLERY);
		expect(gallery.items).toHaveLength(2);
	});

	it('throws when empty', () => {
		expect(() => new MediaGalleryBuilder().toJSON()).toThrow(
			'at least one item',
		);
	});
});

describe('FileComponentBuilder', () => {
	it('builds a file component (happy path)', () => {
		const file = new FileComponentBuilder()
			.setUrl('attachment://report.pdf')
			.setSpoiler()
			.toJSON();
		expect(file).toStrictEqual({
			type: MessageComponentTypes.FILE,
			file: { url: 'attachment://report.pdf' },
			spoiler: true,
		});
	});
});

describe('ContainerBuilder', () => {
	it('builds a valid container with accent color', () => {
		const container = new ContainerBuilder()
			.addComponent(new TextDisplayBuilder().setContent('Hello').toJSON())
			.setAccentColor(0x5865f2)
			.toJSON();
		expect(container.type).toBe(MessageComponentTypes.CONTAINER);
		expect(container.accent_color).toBe(0x5865f2);
		expect(container.components).toHaveLength(1);
	});

	it('clears the accent color to null', () => {
		const container = new ContainerBuilder()
			.addComponent(new TextDisplayBuilder().setContent('Hello').toJSON())
			.setAccentColor(0x5865f2)
			.clearAccentColor()
			.toJSON();
		expect(container.accent_color).toBeNull();
	});

	it('omits accent_color when never set', () => {
		const container = new ContainerBuilder()
			.addComponent(new TextDisplayBuilder().setContent('x').toJSON())
			.toJSON();
		expect('accent_color' in container).toBe(false);
	});

	it('supports nested containers via addComponents', () => {
		const inner = new ContainerBuilder()
			.addComponent(new TextDisplayBuilder().setContent('inner').toJSON())
			.toJSON();
		const container = new ContainerBuilder()
			.addComponents([new TextDisplayBuilder().setContent('a').toJSON(), inner])
			.toJSON();
		expect(container.components).toHaveLength(2);
		expect(container.components[1]).toEqual(inner);
	});
});

describe('resolveMessageData with componentsV2', () => {
	it('adds IS_COMPONENTS_V2 flag when componentsV2: true', () => {
		const { body } = resolveMessageData({
			componentsV2: true,
			components: [new TextDisplayBuilder().setContent('hello').toJSON()],
		});
		expect(body.flags).toBe(InteractionResponseFlags.IS_COMPONENTS_V2);
	});

	it('combines the componentsV2 flag with ephemeral', () => {
		const { body } = resolveMessageData({
			componentsV2: true,
			ephemeral: true,
			components: [],
		});
		expect(body.flags).toBe(
			InteractionResponseFlags.IS_COMPONENTS_V2 |
				InteractionResponseFlags.EPHEMERAL,
		);
	});

	it('does not add the V2 flag for classic messages', () => {
		const { body } = resolveMessageData({ content: 'hi' });
		expect(body.flags).toBeUndefined();
	});

	it('passes V2 components through to the body', () => {
		const td = new TextDisplayBuilder().setContent('hi').toJSON();
		const { body } = resolveMessageData({
			componentsV2: true,
			components: [td],
		});
		expect(body.components).toEqual([td]);
	});
});
