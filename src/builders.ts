import {
	type ActionRow,
	type Button,
	ButtonStyleTypes,
	type EmojiInfo,
	MessageComponentTypes,
	type StringSelect,
	type StringSelectOption,
	type TextInput,
	TextStyleTypes,
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
