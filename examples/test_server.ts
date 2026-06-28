/**
 * E2E test server for discord-interactions-js
 *
 * Usage:
 *   1. Copy .env.example to .env and fill in the variables
 *   2. npx tsx examples/test_server.ts
 *   3. Expose it with ngrok: ngrok http 3000
 *   4. Paste the URL into Discord Developer Portal → Interactions Endpoint URL
 *   5. Run the slash commands in your test server
 */

import 'dotenv/config';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import Fastify from 'fastify';
import {
	ActionRowBuilder,
	type AutocompleteInteraction,
	ButtonBuilder,
	ButtonStyleTypes,
	type ComponentInteraction,
	ContainerBuilder,
	discordInteractions,
	EmbedBuilder,
	InteractionRouter,
	type ModalInteraction,
	registerGuildCommands,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingTypes,
	type SlashCommandDefinition,
	StringSelectBuilder,
	TextDisplayBuilder,
	TextInputBuilder,
} from '../src/index';

// Required environment variables
const APPLICATION_ID = process.env.APPLICATION_ID!;
const BOT_TOKEN = process.env.BOT_TOKEN!;
const PUBLIC_KEY = process.env.PUBLIC_KEY!;
const GUILD_ID = process.env.GUILD_ID!; // test server
const PORT = Number(process.env.PORT ?? 3000);

// Fail fast if any required variable is missing
for (const [key, val] of Object.entries({
	APPLICATION_ID,
	BOT_TOKEN,
	PUBLIC_KEY,
	GUILD_ID,
})) {
	if (!val) throw new Error(`Missing required env var: ${key}`);
}

// Slash commands registered on startup, one per interaction feature to test
const commands: SlashCommandDefinition[] = [
	{ name: 'ping', description: 'Testa resposta imediata' },
	{
		name: 'defer',
		description: 'Testa defer + followup (aguarda 2s antes de responder)',
	},
	{ name: 'ephemeral', description: 'Testa mensagem ephemeral' },
	{ name: 'embed', description: 'Testa resposta com embed' },
	{ name: 'botoes', description: 'Testa botões e componentes' },
	{ name: 'modal', description: 'Abre um modal de formulário' },
	{ name: 'select', description: 'Testa select menu' },
	{
		name: 'v2',
		description: 'Testa Components V2 (Section, TextDisplay, Container)',
	},
	{
		name: 'autocomplete',
		description: 'Testa autocomplete',
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: 'produto',
				description: 'Nome do produto',
				autocomplete: true,
				required: true,
			},
		],
	},
	{
		name: 'opcoes',
		description: 'Testa opções de comando',
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: 'texto',
				description: 'Um texto qualquer',
				required: true,
			},
			{
				type: ApplicationCommandOptionType.Integer,
				name: 'numero',
				description: 'Um número',
				required: false,
				min_value: 1,
				max_value: 100,
			},
		],
	},
];

const PRODUTOS = [
	'Notebook Pro',
	'Mouse Gamer',
	'Teclado Mecânico',
	'Monitor 4K',
	'Headset',
	'Webcam',
];

/** Registers every interaction handler on the given router. */
function registerHandlers(router: InteractionRouter): void {
	// Immediate text response (type 4) — the simplest happy path.
	router.command('ping', async (inter) => {
		await inter.response.send_message({ content: '🏓 Pong! Latência OK.' });
	});

	// Defer (type 5) then edit the original message via REST after work finishes.
	router.command('defer', async (inter) => {
		await inter.response.defer(); // "Bot is thinking..."
		await new Promise((r) => setTimeout(r, 2000)); // simulate processing
		await inter.followup.edit({ content: '✅ Processado após 2 segundos!' });
	});

	// Ephemeral message — visible only to the invoking user (flags: 64).
	router.command('ephemeral', async (inter) => {
		await inter.response.send_message({
			content: '🔒 Só você pode ver esta mensagem.',
			ephemeral: true,
		});
	});

	// Rich embed built with EmbedBuilder.
	router.command('embed', async (inter) => {
		const embed = new EmbedBuilder()
			.setTitle('Produto: Notebook Pro')
			.setDescription('O melhor notebook para desenvolvedores.')
			.setColor(0x5865f2)
			.addField('Preço', 'R$ 4.999,00', true)
			.addField('Estoque', '3 unidades', true)
			.setFooter('Loop Store', 'https://example.com/logo.png')
			.setTimestamp();

		await inter.response.send_message({ embeds: [embed.toJSON()] });
	});

	// Action row with custom-id buttons (success/secondary) and a link button.
	router.command('botoes', async (inter) => {
		const row = new ActionRowBuilder()
			.addComponent(
				new ButtonBuilder()
					.setLabel('Comprar')
					.setCustomId('buy:produto_1')
					.setStyle(ButtonStyleTypes.SUCCESS)
					.toJSON(),
			)
			.addComponent(
				new ButtonBuilder()
					.setLabel('Ver detalhes')
					.setCustomId('details:produto_1')
					.setStyle(ButtonStyleTypes.SECONDARY)
					.toJSON(),
			)
			.addComponent(
				new ButtonBuilder()
					.setLabel('Discord')
					.setUrl('https://discord.com')
					.setStyle(ButtonStyleTypes.LINK)
					.toJSON(),
			);

		await inter.response.send_message({
			content: 'Escolha uma opção:',
			components: [row.toJSON()],
		});
	});

	// Opens a modal (type 9) with a short and a paragraph text input.
	router.command('modal', async (inter) => {
		const row = new ActionRowBuilder().addComponent(
			new TextInputBuilder()
				.setCustomId('nome')
				.setLabel('Seu nome completo')
				.setStyle('SHORT')
				.setPlaceholder('João da Silva')
				.setRequired(true)
				.toJSON(),
		);
		const row2 = new ActionRowBuilder().addComponent(
			new TextInputBuilder()
				.setCustomId('mensagem')
				.setLabel('Mensagem')
				.setStyle('PARAGRAPH')
				.setPlaceholder('Escreva sua mensagem aqui...')
				.setMaxLength(500)
				.toJSON(),
		);

		await inter.response.send_modal({
			custom_id: 'contato',
			title: 'Entre em contato',
			components: [row.toJSON(), row2.toJSON()],
		});
	});

	// String select menu with emoji options.
	router.command('select', async (inter) => {
		const row = new ActionRowBuilder().addComponent(
			new StringSelectBuilder()
				.setCustomId('categoria')
				.setPlaceholder('Escolha uma categoria')
				.addOption({
					label: 'Eletrônicos',
					value: 'eletronicos',
					emoji: { name: '💻', id: undefined },
				})
				.addOption({
					label: 'Roupas',
					value: 'roupas',
					emoji: { name: '👕', id: undefined },
				})
				.addOption({
					label: 'Alimentos',
					value: 'alimentos',
					emoji: { name: '🍕', id: undefined },
				})
				.toJSON(),
		);

		await inter.response.send_message({
			content: 'Selecione uma categoria:',
			components: [row.toJSON()],
		});
	});

	// Components V2: a Container holding a Section (with a button accessory),
	// a Separator, and a trailing TextDisplay. content/embeds are ignored in V2.
	router.command('v2', async (inter) => {
		const container = new ContainerBuilder()
			.setAccentColor(0x5865f2)
			.addComponent(
				new SectionBuilder()
					.addTextDisplay(
						new TextDisplayBuilder()
							.setContent('## 🛍️ Produto em Destaque')
							.toJSON(),
					)
					.addTextDisplay(
						new TextDisplayBuilder()
							.setContent('**Notebook Pro X** — R$ 4.999,00')
							.toJSON(),
					)
					.addTextDisplay(
						new TextDisplayBuilder()
							.setContent('> Em estoque: 3 unidades')
							.toJSON(),
					)
					.setAccessory(
						new ButtonBuilder()
							.setLabel('Comprar agora')
							.setCustomId('buy:notebook_pro')
							.setStyle(ButtonStyleTypes.SUCCESS)
							.toJSON(),
					)
					.toJSON(),
			)
			.addComponent(
				new SeparatorBuilder()
					.setDivider(true)
					.setSpacing(SeparatorSpacingTypes.SMALL)
					.toJSON(),
			)
			.addComponent(
				new TextDisplayBuilder()
					.setContent('*Frete grátis para todo o Brasil*')
					.toJSON(),
			);

		await inter.response.send_message({
			componentsV2: true,
			components: [container.toJSON()],
		});
	});

	// Reads typed command options (string required, integer optional with range).
	router.command('opcoes', async (inter) => {
		const texto = inter.get_option<string>('texto');
		const numero = inter.get_option<number>('numero');

		await inter.response.send_message({
			content: `Texto: **${texto}**${
				numero !== undefined ? `\nNúmero: **${numero}**` : ''
			}`,
			ephemeral: true,
		});
	});

	// Prefix-routed buy buttons (buy:produto_1, buy:notebook_pro, ...).
	router.component_prefix('buy:', async (inter: ComponentInteraction) => {
		const productId = inter.custom_id.split(':')[1];
		await inter.response.send_message({
			content: `✅ Compra iniciada para **${productId}**!\nUm vendedor entrará em contato em breve.`,
			ephemeral: true,
		});
	});

	// Prefix-routed "details" buttons.
	router.component_prefix('details:', async (inter: ComponentInteraction) => {
		const productId = inter.custom_id.split(':')[1];
		await inter.response.send_message({
			content: `ℹ️ Detalhes de **${productId}** serão exibidos aqui.`,
			ephemeral: true,
		});
	});

	// Select menu submission — reads the chosen values.
	router.component('categoria', async (inter: ComponentInteraction) => {
		const selected = inter.values ?? [];
		await inter.response.send_message({
			content: `Categoria selecionada: **${selected.join(', ')}**`,
			ephemeral: true,
		});
	});

	// Modal submission — reads a required and an optional field.
	router.modal('contato', async (inter: ModalInteraction) => {
		const nome = inter.get_field_required('nome');
		const mensagem = inter.get_field('mensagem') ?? '(sem mensagem)';

		await inter.response.send_message({
			content: `📨 Recebido!\n**De:** ${nome}\n**Mensagem:** ${mensagem}`,
			ephemeral: true,
		});
	});

	// Autocomplete — filters the product list by what the user typed.
	router.autocomplete(
		'autocomplete',
		async (inter: AutocompleteInteraction) => {
			const query = inter.focused_option.value.toLowerCase();
			const choices = PRODUTOS.filter((p) =>
				p.toLowerCase().includes(query),
			)
				.slice(0, 25)
				.map((p) => ({ name: p, value: p.toLowerCase().replace(/ /g, '_') }));

			await inter.respond(choices);
		},
	);
}

async function main() {
	const app = Fastify({ logger: { level: 'info' } });
	const router = new InteractionRouter({ logger: app.log });
	registerHandlers(router);

	// Mount the interactions endpoint (verifies signatures, answers PING).
	await app.register(discordInteractions, {
		publicKey: PUBLIC_KEY,
		getBotToken: async () => BOT_TOKEN,
		onInteraction: async (interaction, _reply) => {
			await router.handle(interaction);
		},
	});

	// Register the slash commands on the test guild (instant, unlike global).
	app.log.info('Registrando slash commands na guild de teste...');
	await registerGuildCommands(APPLICATION_ID, BOT_TOKEN, GUILD_ID, commands);
	app.log.info(`${commands.length} comandos registrados com sucesso.`);

	await app.listen({ port: PORT, host: '0.0.0.0' });
	app.log.info(`Servidor rodando em http://localhost:${PORT}`);
	app.log.info(`Exponha com: ngrok http ${PORT}`);
	app.log.info(
		'Depois cole a URL em: Discord Developer Portal → Interactions Endpoint URL',
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
