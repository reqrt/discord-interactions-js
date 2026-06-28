import type {
	AutocompleteInteraction,
	CommandInteraction,
	ComponentInteraction,
	Interaction,
	ModalInteraction,
} from './interaction';
import { InteractionType } from './types';

export type CommandHandler = (
	interaction: CommandInteraction,
) => Promise<void> | void;
export type ComponentHandler = (
	interaction: ComponentInteraction,
) => Promise<void> | void;
export type ModalHandler = (
	interaction: ModalInteraction,
) => Promise<void> | void;
export type AutocompleteHandler = (
	interaction: AutocompleteInteraction,
) => Promise<void> | void;
export type FallbackHandler = (
	interaction: Interaction,
) => Promise<void> | void;

interface PrefixEntry {
	prefix: string;
	handler: ComponentHandler;
}

/**
 * Routes interactions to handlers registered by command name or component
 * `custom_id`. A single router can serve many bots; it holds no per-bot state.
 *
 * Errors thrown inside handlers are caught and logged so a single failing
 * handler never crashes the server, and unmatched interactions receive a
 * sensible default response.
 */
export class InteractionRouter {
	private readonly commands = new Map<string, CommandHandler>();
	private readonly components = new Map<string, ComponentHandler>();
	private readonly componentPrefixes: PrefixEntry[] = [];
	private readonly modals = new Map<string, ModalHandler>();
	private readonly autocompletes = new Map<string, AutocompleteHandler>();
	private fallbackHandler?: FallbackHandler;

	/** Registers a handler for a slash command by name. */
	command(name: string, handler: CommandHandler): this {
		this.commands.set(name, handler);
		return this;
	}

	/** Registers a handler for a component by its exact `custom_id`. */
	component(customId: string, handler: ComponentHandler): this {
		this.components.set(customId, handler);
		return this;
	}

	/**
	 * Registers a handler for any component whose `custom_id` starts with the
	 * given prefix — useful for dynamic ids such as `buy:produto_123`.
	 *
	 * Exact matches registered with {@link component} take priority, and prefixes
	 * are tested in registration order.
	 */
	component_prefix(prefix: string, handler: ComponentHandler): this {
		this.componentPrefixes.push({ prefix, handler });
		return this;
	}

	/** Registers a handler for a modal submission by its exact `custom_id`. */
	modal(customId: string, handler: ModalHandler): this {
		this.modals.set(customId, handler);
		return this;
	}

	/** Registers an autocomplete handler by command name. */
	autocomplete(commandName: string, handler: AutocompleteHandler): this {
		this.autocompletes.set(commandName, handler);
		return this;
	}

	/** Registers a fallback handler for interactions no other handler matched. */
	fallback(handler: FallbackHandler): this {
		this.fallbackHandler = handler;
		return this;
	}

	/**
	 * Dispatches an interaction to its handler. Called by the framework adapter.
	 * Never throws: handler errors are logged and a safe error response is sent.
	 */
	async handle(interaction: Interaction): Promise<void> {
		const matched = this.resolve(interaction);
		if (matched) {
			await this.run(interaction, matched);
			return;
		}
		if (this.fallbackHandler) {
			const fallback = this.fallbackHandler;
			await this.run(interaction, () => fallback(interaction));
			return;
		}
		await this.respondUnmatched(interaction);
	}

	private async run(
		interaction: Interaction,
		handler: () => Promise<void> | void,
	): Promise<void> {
		try {
			await handler();
		} catch (error) {
			console.error(
				`[discord-interactions] Handler threw while processing interaction ${interaction.id}:`,
				error,
			);
			await this.respondWithError(interaction);
		}
	}

	private resolve(
		interaction: Interaction,
	): (() => Promise<void> | void) | undefined {
		switch (interaction.type) {
			case InteractionType.APPLICATION_COMMAND: {
				const command = interaction as CommandInteraction;
				const handler = this.commands.get(command.command_name);
				return handler ? () => handler(command) : undefined;
			}
			case InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE: {
				const autocomplete = interaction as AutocompleteInteraction;
				const handler = this.autocompletes.get(autocomplete.command_name);
				return handler ? () => handler(autocomplete) : undefined;
			}
			case InteractionType.MESSAGE_COMPONENT: {
				const component = interaction as ComponentInteraction;
				const exact = this.components.get(component.custom_id);
				if (exact) {
					return () => exact(component);
				}
				const prefixed = this.componentPrefixes.find((entry) =>
					component.custom_id.startsWith(entry.prefix),
				);
				return prefixed ? () => prefixed.handler(component) : undefined;
			}
			case InteractionType.MODAL_SUBMIT: {
				const modal = interaction as ModalInteraction;
				const handler = this.modals.get(modal.custom_id);
				return handler ? () => handler(modal) : undefined;
			}
			default:
				return undefined;
		}
	}

	private async respondUnmatched(interaction: Interaction): Promise<void> {
		if (interaction.response.is_done()) {
			return;
		}
		if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
			await (interaction as AutocompleteInteraction).respond([]);
			return;
		}
		await interaction.response.send_message({
			content: 'This interaction could not be handled.',
			ephemeral: true,
		});
	}

	private async respondWithError(interaction: Interaction): Promise<void> {
		if (interaction.response.is_done()) {
			return;
		}
		try {
			if (
				interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE
			) {
				await (interaction as AutocompleteInteraction).respond([]);
				return;
			}
			await interaction.response.send_message({
				content: 'Something went wrong while handling this interaction.',
				ephemeral: true,
			});
		} catch (error) {
			console.error(
				`[discord-interactions] Failed to send error response for interaction ${interaction.id}:`,
				error,
			);
		}
	}
}
