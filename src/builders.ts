import {
	type ActionRow,
	type Button,
	ButtonStyleTypes,
	type Container,
	type EmojiInfo,
	type FileComponent,
	type MediaGallery,
	type MediaGalleryItem,
	type MessageComponent,
	MessageComponentTypes,
	type Section,
	type Separator,
	type SeparatorSpacingTypes,
	type StringSelect,
	type StringSelectOption,
	type TextDisplay,
	type TextInput,
	TextStyleTypes,
	type Thumbnail,
} from './components';
import type { EmbedOptions } from './types';

type ButtonEmoji = Pick<EmojiInfo, 'id' | 'name' | 'animated'>;

/**
 * Fluent builder for a {@link Button} component.
 */
export class ButtonBuilder {
	private label?: string;
	private customId?: string;
	private style: ButtonStyleTypes = ButtonStyleTypes.PRIMARY;
	private emoji?: ButtonEmoji;
	private disabled?: boolean;
	private url?: string;

	setLabel(label: string): this {
		this.label = label;
		return this;
	}

	setCustomId(customId: string): this {
		this.customId = customId;
		return this;
	}

	setStyle(style: ButtonStyleTypes): this {
		this.style = style;
		return this;
	}

	setEmoji(emoji: ButtonEmoji): this {
		this.emoji = emoji;
		return this;
	}

	setDisabled(disabled = true): this {
		this.disabled = disabled;
		return this;
	}

	/** Sets the destination url; only valid for `LINK` style buttons. */
	setUrl(url: string): this {
		this.url = url;
		return this;
	}

	toJSON(): Button {
		if (this.style === ButtonStyleTypes.PREMIUM) {
			throw new Error(
				'Premium buttons are not supported by ButtonBuilder; build the Button object directly with a sku_id.',
			);
		}
		if (this.label === undefined && this.emoji === undefined) {
			throw new Error('A button requires a label or an emoji.');
		}

		const button: Record<string, unknown> = {
			type: MessageComponentTypes.BUTTON,
			style: this.style,
		};
		if (this.label !== undefined) {
			button.label = this.label;
		}
		if (this.emoji !== undefined) {
			button.emoji = this.emoji;
		}
		if (this.disabled !== undefined) {
			button.disabled = this.disabled;
		}

		if (this.style === ButtonStyleTypes.LINK) {
			if (this.url === undefined) {
				throw new Error('A LINK button requires a url (call setUrl).');
			}
			button.url = this.url;
		} else {
			if (this.customId === undefined) {
				throw new Error(
					'A non-link button requires a custom_id (call setCustomId).',
				);
			}
			button.custom_id = this.customId;
		}

		return button as unknown as Button;
	}
}

/**
 * Fluent builder for a {@link StringSelect} component.
 */
export class StringSelectBuilder {
	private customId?: string;
	private placeholder?: string;
	private minValues?: number;
	private maxValues?: number;
	private options: StringSelectOption[] = [];

	setCustomId(customId: string): this {
		this.customId = customId;
		return this;
	}

	setPlaceholder(placeholder: string): this {
		this.placeholder = placeholder;
		return this;
	}

	setMinValues(min: number): this {
		this.minValues = min;
		return this;
	}

	setMaxValues(max: number): this {
		this.maxValues = max;
		return this;
	}

	addOption(option: StringSelectOption): this {
		this.options.push(option);
		return this;
	}

	setOptions(options: StringSelectOption[]): this {
		this.options = [...options];
		return this;
	}

	toJSON(): StringSelect {
		if (this.customId === undefined) {
			throw new Error(
				'A string select requires a custom_id (call setCustomId).',
			);
		}
		const select: StringSelect = {
			type: MessageComponentTypes.STRING_SELECT,
			custom_id: this.customId,
			options: this.options,
		};
		if (this.placeholder !== undefined) {
			select.placeholder = this.placeholder;
		}
		if (this.minValues !== undefined) {
			select.min_values = this.minValues;
		}
		if (this.maxValues !== undefined) {
			select.max_values = this.maxValues;
		}
		return select;
	}
}

/**
 * Fluent builder for a {@link TextInput} component (for use inside modals).
 */
export class TextInputBuilder {
	private customId?: string;
	private label?: string;
	private style: TextStyleTypes = TextStyleTypes.SHORT;
	private placeholder?: string;
	private value?: string;
	private required?: boolean;
	private minLength?: number;
	private maxLength?: number;

	setCustomId(customId: string): this {
		this.customId = customId;
		return this;
	}

	setLabel(label: string): this {
		this.label = label;
		return this;
	}

	setStyle(style: 'SHORT' | 'PARAGRAPH'): this {
		this.style =
			style === 'PARAGRAPH' ? TextStyleTypes.PARAGRAPH : TextStyleTypes.SHORT;
		return this;
	}

	setPlaceholder(placeholder: string): this {
		this.placeholder = placeholder;
		return this;
	}

	setValue(value: string): this {
		this.value = value;
		return this;
	}

	setRequired(required = true): this {
		this.required = required;
		return this;
	}

	setMinLength(min: number): this {
		this.minLength = min;
		return this;
	}

	setMaxLength(max: number): this {
		this.maxLength = max;
		return this;
	}

	toJSON(): TextInput {
		if (this.customId === undefined) {
			throw new Error('A text input requires a custom_id (call setCustomId).');
		}
		const input: TextInput = {
			type: MessageComponentTypes.INPUT_TEXT,
			custom_id: this.customId,
			style: this.style,
		};
		if (this.label !== undefined) {
			input.label = this.label;
		}
		if (this.placeholder !== undefined) {
			input.placeholder = this.placeholder;
		}
		if (this.value !== undefined) {
			input.value = this.value;
		}
		if (this.required !== undefined) {
			input.required = this.required;
		}
		if (this.minLength !== undefined) {
			input.min_length = this.minLength;
		}
		if (this.maxLength !== undefined) {
			input.max_length = this.maxLength;
		}
		return input;
	}
}

/**
 * Fluent builder for an {@link ActionRow} component.
 */
export class ActionRowBuilder {
	private components: Array<Button | StringSelect | TextInput> = [];

	addComponent(component: Button | StringSelect | TextInput): this {
		this.components.push(component);
		return this;
	}

	toJSON(): ActionRow {
		return {
			type: MessageComponentTypes.ACTION_ROW,
			components: this.components,
		};
	}
}

/**
 * Fluent builder for an {@link EmbedOptions} embed.
 */
export class EmbedBuilder {
	private embed: EmbedOptions = {};

	setTitle(title: string): this {
		this.embed.title = title;
		return this;
	}

	setDescription(description: string): this {
		this.embed.description = description;
		return this;
	}

	setColor(color: number): this {
		this.embed.color = color;
		return this;
	}

	addField(name: string, value: string, inline?: boolean): this {
		if (!this.embed.fields) {
			this.embed.fields = [];
		}
		this.embed.fields.push(
			inline === undefined ? { name, value } : { name, value, inline },
		);
		return this;
	}

	setFooter(text: string, iconUrl?: string): this {
		this.embed.footer =
			iconUrl === undefined ? { text } : { text, icon_url: iconUrl };
		return this;
	}

	setAuthor(name: string, url?: string, iconUrl?: string): this {
		this.embed.author = { name };
		if (url !== undefined) {
			this.embed.author.url = url;
		}
		if (iconUrl !== undefined) {
			this.embed.author.icon_url = iconUrl;
		}
		return this;
	}

	setThumbnail(url: string): this {
		this.embed.thumbnail = { url };
		return this;
	}

	setImage(url: string): this {
		this.embed.image = { url };
		return this;
	}

	setTimestamp(date: Date = new Date()): this {
		this.embed.timestamp = date.toISOString();
		return this;
	}

	setUrl(url: string): this {
		this.embed.url = url;
		return this;
	}

	toJSON(): EmbedOptions {
		return this.embed;
	}
}

/**
 * Fluent builder for a {@link TextDisplay} component (Components V2). Renders
 * markdown text as a top-level component.
 * @see {@link https://discord.com/developers/docs/components/reference#text-display}
 */
export class TextDisplayBuilder {
	private content = '';
	private id?: number;

	setContent(content: string): this {
		this.content = content;
		return this;
	}

	/** Sets an optional numeric id used to reference this component (V2). */
	setId(id: number): this {
		this.id = id;
		return this;
	}

	toJSON(): TextDisplay {
		const component: TextDisplay = {
			type: MessageComponentTypes.TEXT_DISPLAY,
			content: this.content,
		};
		if (this.id !== undefined) {
			component.id = this.id;
		}
		return component;
	}
}

/**
 * Fluent builder for a {@link Separator} component (Components V2): vertical
 * spacing with an optional divider line.
 * @see {@link https://discord.com/developers/docs/components/reference#separator}
 */
export class SeparatorBuilder {
	private divider?: boolean;
	private spacing?: SeparatorSpacingTypes;
	private id?: number;

	/** Whether a visible divider line is drawn. Defaults to `true`. */
	setDivider(divider = true): this {
		this.divider = divider;
		return this;
	}

	setSpacing(spacing: SeparatorSpacingTypes): this {
		this.spacing = spacing;
		return this;
	}

	setId(id: number): this {
		this.id = id;
		return this;
	}

	toJSON(): Separator {
		const component: Separator = {
			type: MessageComponentTypes.SEPARATOR,
		};
		if (this.divider !== undefined) {
			component.divider = this.divider;
		}
		if (this.spacing !== undefined) {
			component.spacing = this.spacing;
		}
		if (this.id !== undefined) {
			component.id = this.id;
		}
		return component;
	}
}

/**
 * Fluent builder for a {@link Thumbnail} component (Components V2). Typically
 * used as a {@link Section} accessory.
 * @see {@link https://discord.com/developers/docs/components/reference#thumbnail}
 */
export class ThumbnailBuilder {
	private url = '';
	private description?: string;
	private spoiler?: boolean;
	private id?: number;

	/** The media url, e.g. `https://...` or `attachment://file.png`. */
	setUrl(url: string): this {
		this.url = url;
		return this;
	}

	setDescription(description: string): this {
		this.description = description;
		return this;
	}

	setSpoiler(spoiler = true): this {
		this.spoiler = spoiler;
		return this;
	}

	setId(id: number): this {
		this.id = id;
		return this;
	}

	toJSON(): Thumbnail {
		const component: Thumbnail = {
			type: MessageComponentTypes.THUMBNAIL,
			media: { url: this.url },
		};
		if (this.description !== undefined) {
			component.description = this.description;
		}
		if (this.spoiler !== undefined) {
			component.spoiler = this.spoiler;
		}
		if (this.id !== undefined) {
			component.id = this.id;
		}
		return component;
	}
}

/**
 * Fluent builder for a {@link Section} component (Components V2): one to three
 * {@link TextDisplay} components paired with a {@link Thumbnail} or
 * {@link Button} accessory.
 * @see {@link https://discord.com/developers/docs/components/reference#section}
 */
export class SectionBuilder {
	private components: TextDisplay[] = [];
	private accessory?: Thumbnail | Button;
	private id?: number;

	addTextDisplay(display: TextDisplay): this {
		this.components.push(display);
		return this;
	}

	setAccessory(accessory: Thumbnail | Button): this {
		this.accessory = accessory;
		return this;
	}

	setId(id: number): this {
		this.id = id;
		return this;
	}

	toJSON(): Section {
		if (this.components.length < 1 || this.components.length > 3) {
			throw new Error('A section requires between 1 and 3 text displays.');
		}
		if (this.accessory === undefined) {
			throw new Error('A section requires an accessory (call setAccessory).');
		}
		const section: Section = {
			type: MessageComponentTypes.SECTION,
			components: this.components as Section['components'],
			accessory: this.accessory,
		};
		if (this.id !== undefined) {
			section.id = this.id;
		}
		return section;
	}
}

/**
 * Fluent builder for a {@link MediaGallery} component (Components V2): a grid of
 * up to ten media items.
 * @see {@link https://discord.com/developers/docs/components/reference#media-gallery}
 */
export class MediaGalleryBuilder {
	private items: MediaGalleryItem[] = [];
	private id?: number;

	addItem(item: MediaGalleryItem): this {
		this.items.push(item);
		return this;
	}

	addItems(items: MediaGalleryItem[]): this {
		this.items.push(...items);
		return this;
	}

	setId(id: number): this {
		this.id = id;
		return this;
	}

	toJSON(): MediaGallery {
		if (this.items.length === 0) {
			throw new Error('A media gallery requires at least one item.');
		}
		const gallery: MediaGallery = {
			type: MessageComponentTypes.MEDIA_GALLERY,
			items: this.items,
		};
		if (this.id !== undefined) {
			gallery.id = this.id;
		}
		return gallery;
	}
}

/**
 * Fluent builder for a {@link FileComponent} (Components V2). The url must
 * reference an uploaded attachment, e.g. `attachment://file.pdf`.
 * @see {@link https://discord.com/developers/docs/components/reference#file}
 */
export class FileComponentBuilder {
	private url = '';
	private spoiler?: boolean;
	private id?: number;

	/** The attachment reference, e.g. `attachment://file.pdf`. */
	setUrl(url: string): this {
		this.url = url;
		return this;
	}

	setSpoiler(spoiler = true): this {
		this.spoiler = spoiler;
		return this;
	}

	setId(id: number): this {
		this.id = id;
		return this;
	}

	toJSON(): FileComponent {
		const component: FileComponent = {
			type: MessageComponentTypes.FILE,
			file: { url: this.url },
		};
		if (this.spoiler !== undefined) {
			component.spoiler = this.spoiler;
		}
		if (this.id !== undefined) {
			component.id = this.id;
		}
		return component;
	}
}

/**
 * Fluent builder for a {@link Container} component (Components V2): a styled box
 * that can hold any other components, including nested containers.
 * @see {@link https://discord.com/developers/docs/components/reference#container}
 */
export class ContainerBuilder {
	private components: MessageComponent[] = [];
	private accentColor?: number | null;
	private spoiler?: boolean;
	private id?: number;

	addComponent(component: MessageComponent): this {
		this.components.push(component);
		return this;
	}

	addComponents(components: MessageComponent[]): this {
		this.components.push(...components);
		return this;
	}

	/** Sets the accent bar color as a hex number, e.g. `0x5865f2`. */
	setAccentColor(color: number): this {
		this.accentColor = color;
		return this;
	}

	/** Resets the accent color to `null` (no accent bar). */
	clearAccentColor(): this {
		this.accentColor = null;
		return this;
	}

	setSpoiler(spoiler = true): this {
		this.spoiler = spoiler;
		return this;
	}

	setId(id: number): this {
		this.id = id;
		return this;
	}

	toJSON(): Container {
		const container: Container = {
			type: MessageComponentTypes.CONTAINER,
			components: this.components,
		};
		if (this.accentColor !== undefined) {
			container.accent_color = this.accentColor;
		}
		if (this.spoiler !== undefined) {
			container.spoiler = this.spoiler;
		}
		if (this.id !== undefined) {
			container.id = this.id;
		}
		return container;
	}
}
