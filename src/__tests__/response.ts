import type { Interaction } from '../interaction';
import { InteractionResponse } from '../response';
import { InteractionResponseType } from '../types';
import { createMockReply, SNOWFLAKE } from './utils/fixtures';

function makeResponse() {
	const interaction = { id: SNOWFLAKE } as unknown as Interaction;
	const response = new InteractionResponse(interaction);
	const reply = createMockReply();
	response._setReply(reply);
	return { response, reply };
}

describe('InteractionResponse', () => {
	it('send_message sends a CHANNEL_MESSAGE_WITH_SOURCE payload', async () => {
		const { response, reply } = makeResponse();
		await response.send_message({ content: 'Hello world' });

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			data: { content: 'Hello world' },
		});
		expect(response.is_done()).toBe(true);
	});

	it('applies the ephemeral shorthand', async () => {
		const { response, reply } = makeResponse();
		await response.send_message({ content: 'secret', ephemeral: true });

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			data: { content: 'secret', flags: 64 },
		});
	});

	it('defer(true) sends a deferred ephemeral message', async () => {
		const { response, reply } = makeResponse();
		await response.defer(true);

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
			data: { flags: 64 },
		});
	});

	it('defer() without ephemeral omits data', async () => {
		const { response, reply } = makeResponse();
		await response.defer();

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
			data: undefined,
		});
	});

	it('defer_update acknowledges a component silently', async () => {
		const { response, reply } = makeResponse();
		await response.defer_update();

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
		});
	});

	it('edit_message sends an UPDATE_MESSAGE payload', async () => {
		const { response, reply } = makeResponse();
		await response.edit_message({ content: 'edited' });

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.UPDATE_MESSAGE,
			data: { content: 'edited' },
		});
	});

	it('autocomplete returns choices', async () => {
		const { response, reply } = makeResponse();
		await response.autocomplete([{ name: 'First', value: 'first' }]);

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
			data: { choices: [{ name: 'First', value: 'first' }] },
		});
	});

	it('send_modal opens a modal', async () => {
		const { response, reply } = makeResponse();
		await response.send_modal({
			custom_id: 'checkout',
			title: 'Checkout',
			components: [],
		});

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.MODAL,
			data: { custom_id: 'checkout', title: 'Checkout', components: [] },
		});
	});

	it('require_premium sends a PREMIUM_REQUIRED payload', async () => {
		const { response, reply } = makeResponse();
		await response.require_premium();

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.PREMIUM_REQUIRED,
		});
	});

	it('pong acknowledges a ping', async () => {
		const { response, reply } = makeResponse();
		await response.pong();

		expect(reply.send).toHaveBeenCalledWith({
			type: InteractionResponseType.PONG,
		});
	});

	it('sends attachments as a multipart body', async () => {
		const { response, reply } = makeResponse();
		await response.send_message({
			content: 'see file',
			attachments: [{ name: 'a.txt', data: Buffer.from('hi') }],
		});

		expect(reply.header).toHaveBeenCalledWith(
			'content-type',
			expect.stringContaining('multipart/form-data; boundary='),
		);
		const sent = reply.send.mock.calls[0][0];
		expect(Buffer.isBuffer(sent)).toBe(true);
		expect((sent as Buffer).toString('utf-8')).toContain('name="payload_json"');
	});

	it('throws when responding twice', async () => {
		const { response } = makeResponse();
		await response.send_message({ content: 'first' });

		await expect(response.send_message({ content: 'second' })).rejects.toThrow(
			'Already responded to this interaction. Use followup instead.',
		);
	});

	it('throws when no reply is connected', async () => {
		const interaction = { id: SNOWFLAKE } as unknown as Interaction;
		const response = new InteractionResponse(interaction);

		await expect(response.send_message({ content: 'x' })).rejects.toThrow(
			'not connected to an HTTP reply',
		);
	});
});
