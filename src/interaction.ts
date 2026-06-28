import { REST } from '@discordjs/rest';
import type {
	APIAutocompleteApplicationCommandInteractionData,
	APIChatInputApplicationCommandInteractionData,
	APIEntitlement,
	APIGuildMember,
	APIInteraction,
	APIMessageComponentInteractionData,
	APIModalSubmission,
	APIUser,
	ComponentType,
	Snowflake,
} from 'discord-api-types/v10';
import { InteractionFollowup } from './followup';
import { type InteractionReply, InteractionResponse } from './response';
import {
	type AutocompleteChoice,
	InteractionType,
	type MessageOptions,
} from './types';

/** The Discord epoch (2015-01-01T00:00:00Z) in milliseconds. */
const DISCORD_EPOCH = 1420070400000;

/** The interaction token is valid for 15 minutes. */
const TOKEN_LIFETIME_MS = 15 * 60 * 1000;

/**
 * The `data` payload of any interaction this library constructs a typed wrapper
 * for. Subclasses narrow this to the specific shape for their interaction type.
 */
export type APIInteractionData =
	| APIChatInputApplicationCommandInteractionData
	| APIMessageComponentInteractionData
	| APIModalSubmission
	| APIAutocompleteApplicationCommandInteractionData;

/**
 * A permissive view of the raw interaction payload. The discord-api-types
 * `APIInteraction` union is awkward to read field-by-field; normalizing it once
 * here keeps the constructor straightforward.
 */
interface RawInteraction {
	id: Snowflake;
	application_id: Snowflake;
	type: number;
	token: string;
	version: number;
	locale?: string;
	guild_locale?: string;
	guild_id?: Snowflake;
	channel_id?: Snowflake;
	channel?: { id?: Snowflake };
	guild?: { id?: Snowflake };
	app_permissions?: string;
	entitlements?: APIEntitlement[];
	member?: APIGuildMember;
	user?: APIUser;
	data?: APIInteractionData;
}

/**
 * A structural view of a command option for traversal, independent of the
 * exact discord-api-types option union.
 */
interface RawCommandOption {
	name: string;
	value?: string | number | boolean;
	options?: RawCommandOption[];
	focused?: boolean;
}

/**
 * A structural view of a submitted modal component for traversal.
 */
interface RawModalComponent {
	custom_id?: string;
	value?: string;
	values?: string[];
	components?: RawModalComponent[];
	component?: RawModalComponent;
}

/**
 * A received interaction. Wraps the raw HTTP payload with convenience accessors
 * and the {@link response} / {@link followup} helpers used to reply.
 *
 * Stateless: each instance owns its own REST client and holds no global state.
 */
export class Interaction {
	readonly id: Snowflake;
	readonly application_id: Snowflake;
	readonly type: InteractionType;
	readonly token: string;
	readonly version: number;
	readonly locale?: string;
	readonly guild_locale?: string;
	readonly guild_id?: Snowflake;
	readonly channel_id?: Snowflake;
	readonly data?: APIInteractionData;
	readonly app_permissions?: string;
	readonly entitlements: APIEntitlement[];

	/** The invoking user. Resolved from `member.user` in guilds, `user` in DMs. */
	readonly user: APIUser;
	/** The invoking guild member, present only for guild interactions. */
	readonly member?: APIGuildMember;
	/** When the interaction was created, extracted from its snowflake id. */
	readonly created_at: Date;
	/** When the interaction token expires (15 minutes after creation). */
	readonly expires_at: Date;

	/** The immediate response helper (initial reply within 3 seconds). */
	readonly response: InteractionResponse;
	/** The follow-up helper (REST messaging within the 15-minute window). */
	readonly followup: InteractionFollowup;

	private readonly _rest: REST;
	private readonly _hasToken: boolean;

	constructor(payload: APIInteraction, botToken?: string) {
		const raw = payload as unknown as RawInteraction;

		this.id = raw.id;
		this.application_id = raw.application_id;
		this.type = raw.type as InteractionType;
		this.token = raw.token;
		this.version = raw.version;
		this.locale = raw.locale;
		this.guild_locale = raw.guild_locale;
		this.guild_id = raw.guild_id ?? raw.guild?.id;
		this.channel_id = raw.channel_id ?? raw.channel?.id;
		this.data = raw.data;
		this.app_permissions = raw.app_permissions;
		this.entitlements = raw.entitlements ?? [];
		this.member = raw.member;
		this.user = (raw.member?.user ?? raw.user) as APIUser;

		const createdMs = Number(BigInt(this.id) >> 22n) + DISCORD_EPOCH;
		this.created_at = new Date(createdMs);
		this.expires_at = new Date(createdMs + TOKEN_LIFETIME_MS);

		// Follow-ups authenticate via the interaction token (auth: false), so a bot
		// token is optional. When one is provided we set it so that other
		// authenticated REST calls work; otherwise the client is left token-less.
		this._hasToken = Boolean(botToken);
		this._rest = botToken
			? new REST({ version: '10' }).setToken(botToken)
			: new REST({ version: '10' });

		this.response = new InteractionResponse(this);
		this.followup = new InteractionFollowup(
			this.application_id,
			this.token,
			this._rest,
		);
	}

	/** Whether the interaction token has expired (15 minutes after creation). */
	is_expired(): boolean {
		return Date.now() > this.expires_at.getTime();
	}

	/** Shorthand for {@link InteractionResponse.send_message}. */
	async send(options: MessageOptions): Promise<void> {
		await this.response.send_message(options);
	}

	/** Shorthand for {@link InteractionResponse.defer}. */
	async defer(ephemeral?: boolean): Promise<void> {
		await this.response.defer(ephemeral);
	}

	/**
	 * Connects the HTTP reply used for the immediate response. Called internally
	 * by the framework adapter before user handlers run.
	 * @internal
	 */
	_setReply(reply: InteractionReply): void {
		this.response._setReply(reply);
	}

	/**
	 * Whether this interaction's REST client was constructed with a bot token.
	 * Follow-ups work without one (they use the interaction token), but other
	 * authenticated REST calls require it. Internal helper for future use.
	 * @internal
	 */
	get hasToken(): boolean {
		return this._hasToken;
	}
}

/**
 * A slash command (chat input) interaction.
 */
export class CommandInteraction extends Interaction {
	declare readonly data: APIChatInputApplicationCommandInteractionData;
	/** The invoked command name. */
	readonly command_name: string;
	/** A flat map of every provided option value, keyed by option name. */
	readonly options: Map<string, string | number | boolean>;

	constructor(payload: APIInteraction, botToken?: string) {
		super(payload, botToken);
		this.command_name = this.data.name;
		this.options = new Map();
		collectOptions(
			this.data.options as unknown as RawCommandOption[] | undefined,
			this.options,
		);
	}

	/**
	 * Returns the value of an option by name, or `undefined` if it was not
	 * provided. Subcommand option values are flattened into the same map.
	 */
	get_option<T = string>(name: string): T | undefined {
		return this.options.get(name) as T | undefined;
	}
}

/**
 * A message component interaction (button click or select menu submission).
 */
export class ComponentInteraction extends Interaction {
	declare readonly data: APIMessageComponentInteractionData;
	/** The component's developer-defined `custom_id`. */
	readonly custom_id: string;
	/** The type of component that was used. */
	readonly component_type: ComponentType;
	/** The selected values, for select-menu components. */
	readonly values?: string[];

	constructor(payload: APIInteraction, botToken?: string) {
		super(payload, botToken);
		this.custom_id = this.data.custom_id;
		this.component_type = this.data.component_type;
		this.values = 'values' in this.data ? this.data.values : undefined;
	}

	/**
	 * Edits the message the component is attached to, inline (response `type: 7`).
	 */
	async update(options: MessageOptions): Promise<void> {
		await this.response.edit_message(options);
	}

	/**
	 * Acknowledges the interaction without a visible loading state, to edit the
	 * message later via follow-up (response `type: 6`).
	 */
	async defer_update(): Promise<void> {
		await this.response.defer_update();
	}
}

/**
 * A modal (form) submission interaction.
 */
export class ModalInteraction extends Interaction {
	declare readonly data: APIModalSubmission;
	/** The modal's developer-defined `custom_id`. */
	readonly custom_id: string;

	constructor(payload: APIInteraction, botToken?: string) {
		super(payload, botToken);
		this.custom_id = this.data.custom_id;
	}

	/**
	 * Returns the submitted value of a field by its component `custom_id`, or
	 * `undefined` if the field is absent.
	 */
	get_field(customId: string): string | undefined {
		return findModalValue(
			this.data.components as unknown as RawModalComponent[],
			customId,
		);
	}

	/**
	 * Like {@link get_field} but throws a descriptive error when the field is
	 * missing. Useful for required inputs.
	 */
	get_field_required(customId: string): string {
		const value = this.get_field(customId);
		if (value === undefined) {
			throw new Error(
				`Modal field "${customId}" is missing from submission of interaction ${this.id}.`,
			);
		}
		return value;
	}
}

/**
 * An application command autocomplete interaction.
 */
export class AutocompleteInteraction extends Interaction {
	declare readonly data: APIAutocompleteApplicationCommandInteractionData;
	/** The command name being autocompleted. */
	readonly command_name: string;
	/** The option currently being typed by the user. */
	readonly focused_option: { name: string; value: string };

	constructor(payload: APIInteraction, botToken?: string) {
		super(payload, botToken);
		this.command_name = this.data.name;
		this.focused_option = findFocusedOption(
			this.data.options as unknown as RawCommandOption[] | undefined,
		) ?? { name: '', value: '' };
	}

	/**
	 * Returns autocomplete choices to display (response `type: 8`).
	 */
	async respond(choices: AutocompleteChoice[]): Promise<void> {
		await this.response.autocomplete(choices);
	}
}

/**
 * Constructs the appropriate {@link Interaction} subclass for a raw payload.
 * Used by framework adapters; `PING` interactions are handled before this point.
 */
export function createInteraction(
	payload: APIInteraction,
	botToken?: string,
): Interaction {
	const type = payload.type as number;
	switch (type) {
		case InteractionType.APPLICATION_COMMAND:
			return new CommandInteraction(payload, botToken);
		case InteractionType.MESSAGE_COMPONENT:
			return new ComponentInteraction(payload, botToken);
		case InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE:
			return new AutocompleteInteraction(payload, botToken);
		case InteractionType.MODAL_SUBMIT:
			return new ModalInteraction(payload, botToken);
		default:
			return new Interaction(payload, botToken);
	}
}

/**
 * Recursively flattens command options into a name → value map, descending into
 * subcommands and subcommand groups so leaf values are reachable by name.
 */
function collectOptions(
	options: RawCommandOption[] | undefined,
	out: Map<string, string | number | boolean>,
): void {
	if (!options) {
		return;
	}
	for (const option of options) {
		if (option.options) {
			collectOptions(option.options, out);
		} else if (option.value !== undefined) {
			out.set(option.name, option.value);
		}
	}
}

/**
 * Recursively finds the focused option of an autocomplete interaction.
 */
function findFocusedOption(
	options: RawCommandOption[] | undefined,
): { name: string; value: string } | undefined {
	if (!options) {
		return undefined;
	}
	for (const option of options) {
		if (option.options) {
			const found = findFocusedOption(option.options);
			if (found) {
				return found;
			}
		}
		if (option.focused) {
			return { name: option.name, value: String(option.value ?? '') };
		}
	}
	return undefined;
}

/**
 * Recursively searches submitted modal components for the value of the
 * component with the given `custom_id`, descending through action rows and
 * label wrappers.
 */
function findModalValue(
	components: RawModalComponent[],
	customId: string,
): string | undefined {
	for (const component of components) {
		if (component.custom_id === customId) {
			if (component.value !== undefined) {
				return component.value;
			}
			if (component.values !== undefined) {
				return component.values[0];
			}
		}
		if (component.components) {
			const found = findModalValue(component.components, customId);
			if (found !== undefined) {
				return found;
			}
		}
		if (component.component) {
			const found = findModalValue([component.component], customId);
			if (found !== undefined) {
				return found;
			}
		}
	}
	return undefined;
}
