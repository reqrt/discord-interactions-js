import { REST } from '@discordjs/rest';
import {
	type ApplicationCommandOptionType,
	Routes,
} from 'discord-api-types/v10';

/**
 * A single option (argument) of a slash command, including subcommands.
 */
export interface SlashCommandOption {
	type: ApplicationCommandOptionType;
	name: string;
	description: string;
	required?: boolean;
	choices?: { name: string; value: string | number }[];
	/** Nested options, for subcommands and subcommand groups. */
	options?: SlashCommandOption[];
	autocomplete?: boolean;
	min_value?: number;
	max_value?: number;
	min_length?: number;
	max_length?: number;
}

/**
 * A slash command definition to register with Discord.
 */
export interface SlashCommandDefinition {
	name: string;
	description: string;
	options?: SlashCommandOption[];
	default_member_permissions?: string;
	dm_permission?: boolean;
}

function restClient(botToken: string): REST {
	return new REST({ version: '10' }).setToken(botToken);
}

/**
 * Registers (overwrites) the application's global commands. Global commands can
 * take up to an hour to propagate.
 */
export async function registerGlobalCommands(
	applicationId: string,
	botToken: string,
	commands: SlashCommandDefinition[],
): Promise<void> {
	await restClient(botToken).put(Routes.applicationCommands(applicationId), {
		body: commands,
	});
}

/**
 * Registers (overwrites) the application's commands for a single guild. Guild
 * commands update instantly, which is convenient during development.
 */
export async function registerGuildCommands(
	applicationId: string,
	botToken: string,
	guildId: string,
	commands: SlashCommandDefinition[],
): Promise<void> {
	await restClient(botToken).put(
		Routes.applicationGuildCommands(applicationId, guildId),
		{ body: commands },
	);
}

/**
 * Lists the currently registered commands, globally or for a single guild.
 */
export async function getCommands(
	applicationId: string,
	botToken: string,
	guildId?: string,
): Promise<SlashCommandDefinition[]> {
	const route = guildId
		? Routes.applicationGuildCommands(applicationId, guildId)
		: Routes.applicationCommands(applicationId);
	return (await restClient(botToken).get(route)) as SlashCommandDefinition[];
}

/**
 * Removes all registered commands, globally or for a single guild.
 */
export async function clearCommands(
	applicationId: string,
	botToken: string,
	guildId?: string,
): Promise<void> {
	const route = guildId
		? Routes.applicationGuildCommands(applicationId, guildId)
		: Routes.applicationCommands(applicationId);
	await restClient(botToken).put(route, { body: [] });
}
