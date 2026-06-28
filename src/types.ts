import type { Snowflake } from 'discord-api-types/v10';
import {
	ApplicationCommandOptionType,
	ComponentType,
} from 'discord-api-types/v10';
import type {
	ActionRow,
	Container,
	FileComponent,
	MediaGallery,
	Section,
	Separator,
	TextDisplay,
} from './components';

/**
 * The type of interaction this request is.
 */
export enum InteractionType {
	/**
	 * A ping.
	 */
	PING = 1,
	/**
	 * A command invocation.
	 */
	APPLICATION_COMMAND = 2,
	/**
	 * Usage of a message's component.
	 */
	MESSAGE_COMPONENT = 3,
	/**
	 * An interaction sent when an application command option is filled out.
	 */
	APPLICATION_COMMAND_AUTOCOMPLETE = 4,
	/**
	 * An interaction sent when a modal is submitted.
	 */
	MODAL_SUBMIT = 5,
}

/**
 * The type of response that is being sent.
 */
export enum InteractionResponseType {
	/**
	 * Acknowledge a `PING`.
	 */
	PONG = 1,
	/**
	 * Respond with a message, showing the user's input.
	 */
	CHANNEL_MESSAGE_WITH_SOURCE = 4,
	/**
	 * Acknowledge a command without sending a message, showing the user's input. Requires follow-up.
	 */
	DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
	/**
	 * Acknowledge an interaction and edit the original message that contains the component later; the user does not see a loading state.
	 */
	DEFERRED_UPDATE_MESSAGE = 6,
	/**
	 * Edit the message the component was attached to.
	 */
	UPDATE_MESSAGE = 7,
	/*
	 * Callback for an app to define the results to the user.
	 */
	APPLICATION_COMMAND_AUTOCOMPLETE_RESULT = 8,
	/*
	 * Respond with a modal.
	 */
	MODAL = 9,
	/*
	 * Respond with an upgrade prompt.
	 */
	PREMIUM_REQUIRED = 10,

	/**
	 * Launch an Activity.
	 */
	LAUNCH_ACTIVITY = 12,
}

/**
 * Flags that can be included in an Interaction Response.
 */
export enum InteractionResponseFlags {
	/**
	 * Show the message only to the user that performed the interaction. Message
	 * does not persist between sessions.
	 */
	EPHEMERAL = 1 << 6,

	/**
	 * Enables the Components V2 layout engine for this message.
	 *
	 * **When this flag is set, Discord ignores `content` and `embeds` entirely.**
	 * The whole message must be composed using V2 components (`Section`,
	 * `TextDisplay`, `Container`, `MediaGallery`, `Separator`, `FileComponent`).
	 *
	 * Use the `componentsV2: true` shorthand in {@link MessageOptions} instead of
	 * setting this flag manually — it is clearer and less error-prone.
	 *
	 * @see {@link https://discord.com/developers/docs/components/reference}
	 */
	IS_COMPONENTS_V2 = 1 << 15,
}

// Re-export the relevant enums from discord-api-types so consumers of this
// library do not need to install it separately to build command definitions
// and inspect component interactions.
export { ApplicationCommandOptionType, ComponentType };

/**
 * Controls which mentions are parsed and allowed to ping in a message.
 * @see {@link https://discord.com/developers/docs/resources/message#allowed-mentions-object}
 */
export interface AllowedMentions {
	parse?: ('roles' | 'users' | 'everyone')[];
	roles?: Snowflake[];
	users?: Snowflake[];
	replied_user?: boolean;
}

/**
 * A single field within an embed.
 */
export interface EmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

/**
 * A rich embed. This is a structural subset of Discord's embed object and is
 * serialized directly into the message payload.
 * @see {@link https://discord.com/developers/docs/resources/message#embed-object}
 */
export interface EmbedOptions {
	title?: string;
	description?: string;
	color?: number;
	fields?: EmbedField[];
	footer?: { text: string; icon_url?: string };
	author?: { name: string; url?: string; icon_url?: string };
	thumbnail?: { url: string };
	image?: { url: string };
	/** ISO 8601 timestamp. */
	timestamp?: string;
	url?: string;
}

/**
 * A file to upload alongside a message. The raw `data` is sent as multipart
 * form-data and linked to the message through its `attachments` entry.
 */
export interface AttachmentOptions {
	/** The filename, e.g. `receipt.png`. */
	name: string;
	/** The raw file contents. */
	data: Buffer | Uint8Array | string;
	/** Optional alt-text style description for the attachment. */
	description?: string;
	/** Explicit content type, e.g. `image/png`. Inferred by Discord when omitted. */
	contentType?: string;
}

/**
 * Components allowed at the top level of a classic (V1) message — only
 * {@link ActionRow}, alongside `content` and `embeds`.
 */
export type V1TopLevelComponent = ActionRow;

/**
 * Components allowed at the top level of a Components V2 message. When V2 is
 * active, Discord ignores `content` and `embeds` and renders the message
 * entirely from its components.
 * @see {@link https://discord.com/developers/docs/components/reference}
 */
export type V2TopLevelComponent =
	| ActionRow
	| Section
	| TextDisplay
	| Separator
	| Container
	| MediaGallery
	| FileComponent;

/**
 * Any component that can appear at the top level of a message, in either the
 * classic (V1) or the Components V2 layout mode.
 */
export type TopLevelComponent = V1TopLevelComponent | V2TopLevelComponent;

/**
 * Options accepted everywhere a message is created or edited (initial
 * responses, message updates, and follow-ups).
 */
export interface MessageOptions {
	content?: string;
	embeds?: EmbedOptions[];
	/**
	 * The message's top-level components.
	 *
	 * **Components V1 (default):** only {@link ActionRow} is allowed, and the
	 * message may also use `content` and `embeds`.
	 *
	 * **Components V2** (when `flags` includes `IS_COMPONENTS_V2`, or
	 * `componentsV2: true`): `ActionRow`, `Section`, `TextDisplay`, `Separator`,
	 * `Container`, `MediaGallery`, and `FileComponent` are allowed at the top
	 * level. In this mode Discord **ignores `content` and `embeds`** — the whole
	 * message is defined by its components.
	 *
	 * @see {@link https://discord.com/developers/docs/components/reference}
	 */
	components?: V1TopLevelComponent[] | V2TopLevelComponent[];
	/**
	 * Raw message flags. Combine values from {@link InteractionResponseFlags}.
	 */
	flags?: InteractionResponseFlags | number;
	/** Shorthand for `flags: InteractionResponseFlags.EPHEMERAL` (`64`). */
	ephemeral?: boolean;
	/**
	 * Enables Components V2 by adding the `IS_COMPONENTS_V2` flag (`1 << 15`) to
	 * the message flags.
	 *
	 * When `true`, Discord ignores `content` and `embeds`; compose the whole
	 * message with the V2 builders (`SectionBuilder`, `ContainerBuilder`,
	 * `MediaGalleryBuilder`, ...).
	 *
	 * @see {@link https://discord.com/developers/docs/components/reference}
	 */
	componentsV2?: boolean;
	allowed_mentions?: AllowedMentions;
	attachments?: AttachmentOptions[];
}

/**
 * Options for opening a modal in response to an interaction.
 */
export interface ModalOptions {
	custom_id: string;
	title: string;
	/** Action rows containing the modal's text inputs. */
	components: ActionRow[];
}

/**
 * A single choice returned from an autocomplete interaction.
 */
export interface AutocompleteChoice {
	name: string;
	value: string | number;
}
