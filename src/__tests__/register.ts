jest.mock('@discordjs/rest', () => {
	const instance: { setToken: jest.Mock; put: jest.Mock; get: jest.Mock } = {
		setToken: jest.fn(() => instance),
		put: jest.fn().mockResolvedValue(undefined),
		get: jest.fn().mockResolvedValue([{ name: 'produtos' }]),
	};
	return {
		REST: jest.fn(() => instance),
		__getInstance: () => instance,
	};
});

import * as restModule from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import {
	clearCommands,
	getCommands,
	registerGlobalCommands,
	registerGuildCommands,
} from '../register';

interface RestInstance {
	setToken: jest.Mock;
	put: jest.Mock;
	get: jest.Mock;
}

const instance = (
	restModule as unknown as { __getInstance: () => RestInstance }
).__getInstance();

const APP = 'app-id';
const TOKEN = 'bot-token';
const GUILD = 'guild-id';
const COMMANDS = [{ name: 'produtos', description: 'Lista produtos' }];

beforeEach(() => {
	jest.clearAllMocks();
});

describe('command registration', () => {
	it('registerGlobalCommands PUTs to the global route', async () => {
		await registerGlobalCommands(APP, TOKEN, COMMANDS);

		expect(instance.setToken).toHaveBeenCalledWith(TOKEN);
		expect(instance.put).toHaveBeenCalledWith(Routes.applicationCommands(APP), {
			body: COMMANDS,
		});
	});

	it('registerGuildCommands PUTs to the guild route', async () => {
		await registerGuildCommands(APP, TOKEN, GUILD, COMMANDS);

		expect(instance.put).toHaveBeenCalledWith(
			Routes.applicationGuildCommands(APP, GUILD),
			{ body: COMMANDS },
		);
	});

	it('getCommands GETs the global route by default', async () => {
		const result = await getCommands(APP, TOKEN);

		expect(instance.get).toHaveBeenCalledWith(Routes.applicationCommands(APP));
		expect(result).toStrictEqual([{ name: 'produtos' }]);
	});

	it('getCommands GETs the guild route when a guild is given', async () => {
		await getCommands(APP, TOKEN, GUILD);

		expect(instance.get).toHaveBeenCalledWith(
			Routes.applicationGuildCommands(APP, GUILD),
		);
	});

	it('clearCommands PUTs an empty array', async () => {
		await clearCommands(APP, TOKEN);

		expect(instance.put).toHaveBeenCalledWith(Routes.applicationCommands(APP), {
			body: [],
		});
	});
});
