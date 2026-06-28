import { Routes } from 'discord-api-types/v10';
import { InteractionFollowup } from '../followup';
import { APP_ID, createMockRest, TOKEN } from './utils/fixtures';

describe('InteractionFollowup', () => {
	it('send() POSTs to the webhook route with auth disabled', async () => {
		const { rest, mock } = createMockRest();
		const followup = new InteractionFollowup(APP_ID, TOKEN, rest);

		const result = await followup.send({ content: 'hi', ephemeral: true });

		expect(mock.post).toHaveBeenCalledTimes(1);
		expect(mock.post).toHaveBeenCalledWith(Routes.webhook(APP_ID, TOKEN), {
			body: { content: 'hi', flags: 64 },
			files: undefined,
			auth: false,
		});
		expect(result).toStrictEqual({ id: 'message-1' });
	});

	it('edit() PATCHes the original message', async () => {
		const { rest, mock } = createMockRest();
		const followup = new InteractionFollowup(APP_ID, TOKEN, rest);

		await followup.edit({ content: 'updated' });

		expect(mock.patch).toHaveBeenCalledWith(
			Routes.webhookMessage(APP_ID, TOKEN, '@original'),
			{ body: { content: 'updated' }, files: undefined, auth: false },
		);
	});

	it('delete() DELETEs the original message', async () => {
		const { rest, mock } = createMockRest();
		const followup = new InteractionFollowup(APP_ID, TOKEN, rest);

		await followup.delete();

		expect(mock.delete).toHaveBeenCalledWith(
			Routes.webhookMessage(APP_ID, TOKEN, '@original'),
			{ auth: false },
		);
	});

	it('fetch_message() GETs a specific follow-up message', async () => {
		const { rest, mock } = createMockRest();
		const followup = new InteractionFollowup(APP_ID, TOKEN, rest);

		await followup.fetch_message('999');

		expect(mock.get).toHaveBeenCalledWith(
			Routes.webhookMessage(APP_ID, TOKEN, '999'),
			{ auth: false },
		);
	});

	it('forwards attachments to the REST client as files', async () => {
		const { rest, mock } = createMockRest();
		const followup = new InteractionFollowup(APP_ID, TOKEN, rest);
		const data = Buffer.from('bytes');

		await followup.send({
			content: 'file',
			attachments: [{ name: 'a.png', data, contentType: 'image/png' }],
		});

		const call = mock.post.mock.calls[0][1];
		expect(call.files).toStrictEqual([
			{ name: 'a.png', data, contentType: 'image/png' },
		]);
		expect(call.body.attachments).toStrictEqual([
			{ id: 0, filename: 'a.png', description: undefined },
		]);
	});
});
