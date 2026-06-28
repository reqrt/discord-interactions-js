import { buildMultipartFormData, resolveMessageData } from '../message';
import { InteractionResponseFlags } from '../types';

describe('resolveMessageData', () => {
	it('passes through content, embeds and components', () => {
		const { body, files } = resolveMessageData({
			content: 'hello',
			embeds: [{ title: 'hi' }],
			components: [],
		});
		expect(body).toStrictEqual({
			content: 'hello',
			embeds: [{ title: 'hi' }],
			components: [],
		});
		expect(files).toBeUndefined();
	});

	it('folds the ephemeral shorthand into flags', () => {
		const { body } = resolveMessageData({ content: 'secret', ephemeral: true });
		expect(body.flags).toBe(InteractionResponseFlags.EPHEMERAL);
	});

	it('combines explicit flags with the ephemeral shorthand', () => {
		const { body } = resolveMessageData({
			flags: InteractionResponseFlags.IS_COMPONENTS_V2,
			ephemeral: true,
		});
		expect(body.flags).toBe(
			InteractionResponseFlags.IS_COMPONENTS_V2 |
				InteractionResponseFlags.EPHEMERAL,
		);
	});

	it('omits flags when none are set', () => {
		const { body } = resolveMessageData({ content: 'plain' });
		expect(body.flags).toBeUndefined();
	});

	it('splits attachments into files and attachment metadata', () => {
		const data = Buffer.from('file-bytes');
		const { body, files } = resolveMessageData({
			attachments: [{ name: 'receipt.png', data, description: 'a receipt' }],
		});
		expect(files).toStrictEqual([
			{ name: 'receipt.png', data, contentType: undefined },
		]);
		expect(body.attachments).toStrictEqual([
			{ id: 0, filename: 'receipt.png', description: 'a receipt' },
		]);
	});
});

describe('buildMultipartFormData', () => {
	it('produces a well-formed multipart body referencing files[n]', () => {
		const payload = { type: 4, data: { content: 'see attached' } };
		const { body, contentType } = buildMultipartFormData(payload, [
			{ name: 'a.txt', data: Buffer.from('hello'), contentType: 'text/plain' },
		]);

		const boundaryMatch = contentType.match(
			/^multipart\/form-data; boundary=(.+)$/,
		);
		expect(boundaryMatch).not.toBeNull();
		const boundary = (boundaryMatch as RegExpMatchArray)[1];

		const text = body.toString('utf-8');
		// payload_json part holds the serialized callback
		expect(text).toContain('name="payload_json"');
		expect(text).toContain(JSON.stringify(payload));
		// file part is keyed files[0] with its filename and contents
		expect(text).toContain('name="files[0]"; filename="a.txt"');
		expect(text).toContain('Content-Type: text/plain');
		expect(text).toContain('hello');
		// terminates with the closing boundary
		expect(text.endsWith(`--${boundary}--\r\n`)).toBe(true);
	});
});
