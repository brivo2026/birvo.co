import { createHmac } from 'node:crypto';
import { MetaChannelAdapter } from './meta.adapter';

function mockFetchOnce(status: number, body: unknown, headers: Record<string, string> = {}) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    arrayBuffer: async () => Buffer.from(JSON.stringify(body)),
    headers: { get: (key: string) => headers[key.toLowerCase()] ?? null },
  });
}

describe('MetaChannelAdapter', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  describe('isEnabled', () => {
    it('está desactivado sin credenciales', () => {
      const adapter = new MetaChannelAdapter('whatsapp', {});
      expect(adapter.isEnabled()).toBe(false);
    });

    it('está activado con appSecret y token', () => {
      const adapter = new MetaChannelAdapter('whatsapp', { appSecret: 's', pageOrPhoneToken: 't' });
      expect(adapter.isEnabled()).toBe(true);
    });

    it('sendTextMessage lanza si está desactivado', async () => {
      const adapter = new MetaChannelAdapter('whatsapp', {});
      await expect(
        adapter.sendTextMessage({ channelAccountExternalId: 'x', recipientExternalId: 'y', text: 'hola', internalMessageId: '1' }),
      ).rejects.toThrow(/desactivado/);
    });
  });

  describe('verifyWebhookSignature', () => {
    const secret = 'my-app-secret';
    const rawBody = JSON.stringify({ hello: 'world' });
    const adapter = new MetaChannelAdapter('whatsapp', {});

    it('acepta una firma HMAC-SHA256 correcta', async () => {
      const signature = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
      const valid = await adapter.verifyWebhookSignature({ rawBody, signatureHeader: signature, secret });
      expect(valid).toBe(true);
    });

    it('rechaza una firma incorrecta', async () => {
      const valid = await adapter.verifyWebhookSignature({ rawBody, signatureHeader: 'sha256=deadbeef', secret });
      expect(valid).toBe(false);
    });

    it('rechaza si falta el header', async () => {
      const valid = await adapter.verifyWebhookSignature({ rawBody, signatureHeader: undefined, secret });
      expect(valid).toBe(false);
    });
  });

  describe('normalizeWebhook — WhatsApp Cloud API', () => {
    const adapter = new MetaChannelAdapter('whatsapp', {});

    it('normaliza un mensaje de texto entrante', async () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: { phone_number_id: 'PHONE_123' },
                  contacts: [{ profile: { name: 'Laura Gómez' }, wa_id: '573001112233' }],
                  messages: [
                    {
                      from: '573001112233',
                      id: 'wamid.ABC',
                      timestamp: '1700000000',
                      type: 'text',
                      text: { body: 'Hola BIRVO' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const result = await adapter.normalizeWebhook(payload);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toMatchObject({
        provider: 'whatsapp',
        channelAccountExternalId: 'PHONE_123',
        externalMessageId: 'wamid.ABC',
        externalUserId: '573001112233',
        contactDisplayName: 'Laura Gómez',
        messageType: 'text',
        text: 'Hola BIRVO',
      });
      expect(result.statusUpdates).toHaveLength(0);
    });

    it('normaliza un mensaje de imagen usando el media id como mediaUrl', async () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: { phone_number_id: 'PHONE_123' },
                  messages: [
                    {
                      from: '573001112233',
                      id: 'wamid.IMG',
                      timestamp: '1700000000',
                      type: 'image',
                      image: { id: 'MEDIA_ID_1', mime_type: 'image/jpeg', caption: 'mira esto' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const result = await adapter.normalizeWebhook(payload);
      expect(result.messages[0]).toMatchObject({
        messageType: 'image',
        mediaUrl: 'MEDIA_ID_1',
        mediaMimeType: 'image/jpeg',
        text: 'mira esto',
      });
    });

    it('normaliza actualizaciones de estado (sent/delivered/read/failed)', async () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: { phone_number_id: 'PHONE_123' },
                  statuses: [
                    { id: 'wamid.ABC', status: 'read', timestamp: '1700000100' },
                    { id: 'wamid.DEF', status: 'failed', timestamp: '1700000200', errors: [{ title: 'Número inválido' }] },
                  ],
                },
              },
            ],
          },
        ],
      };

      const result = await adapter.normalizeWebhook(payload);
      expect(result.statusUpdates).toHaveLength(2);
      expect(result.statusUpdates[0]).toMatchObject({ externalMessageId: 'wamid.ABC', status: 'read' });
      expect(result.statusUpdates[1]).toMatchObject({ externalMessageId: 'wamid.DEF', status: 'failed', errorReason: 'Número inválido' });
    });

    it('ignora entradas sin messages/statuses sin lanzar', async () => {
      const result = await adapter.normalizeWebhook({ entry: [{ changes: [{ value: {} }] }] });
      expect(result.messages).toHaveLength(0);
      expect(result.statusUpdates).toHaveLength(0);
    });
  });

  describe('normalizeWebhook — Messenger/Instagram', () => {
    const adapter = new MetaChannelAdapter('messenger', {});

    it('normaliza un mensaje de texto entrante', async () => {
      const payload = {
        entry: [
          {
            id: 'PAGE_1',
            messaging: [
              {
                sender: { id: 'USER_1' },
                recipient: { id: 'PAGE_1' },
                timestamp: 1700000000000,
                message: { mid: 'mid.1', text: 'Hola desde Messenger' },
              },
            ],
          },
        ],
      };

      const result = await adapter.normalizeWebhook(payload);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toMatchObject({
        provider: 'messenger',
        channelAccountExternalId: 'PAGE_1',
        externalMessageId: 'mid.1',
        externalUserId: 'USER_1',
        messageType: 'text',
        text: 'Hola desde Messenger',
      });
    });

    it('normaliza un adjunto con URL directa', async () => {
      const payload = {
        entry: [
          {
            id: 'PAGE_1',
            messaging: [
              {
                sender: { id: 'USER_1' },
                message: { mid: 'mid.2', attachments: [{ type: 'image', payload: { url: 'https://cdn.example/img.jpg' } }] },
              },
            ],
          },
        ],
      };

      const result = await adapter.normalizeWebhook(payload);
      expect(result.messages[0]).toMatchObject({ messageType: 'image', mediaUrl: 'https://cdn.example/img.jpg' });
    });

    it('ignora los eco de mensajes salientes (is_echo)', async () => {
      const payload = {
        entry: [{ id: 'PAGE_1', messaging: [{ sender: { id: 'PAGE_1' }, message: { mid: 'mid.3', text: 'eco', is_echo: true } }] }],
      };
      const result = await adapter.normalizeWebhook(payload);
      expect(result.messages).toHaveLength(0);
    });
  });

  describe('sendTextMessage', () => {
    it('WhatsApp: envía y devuelve el id de mensaje de la Graph API', async () => {
      const adapter = new MetaChannelAdapter('whatsapp', { appSecret: 's', pageOrPhoneToken: 'token' });
      mockFetchOnce(200, { messages: [{ id: 'wamid.OUT1' }] });

      const result = await adapter.sendTextMessage({
        channelAccountExternalId: 'PHONE_123',
        recipientExternalId: '573001112233',
        text: 'Hola!',
        internalMessageId: 'internal-1',
      });

      expect(result).toEqual({ externalMessageId: 'wamid.OUT1', status: 'sent' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/PHONE_123/messages'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('WhatsApp: devuelve status failed si la Graph API responde con error', async () => {
      const adapter = new MetaChannelAdapter('whatsapp', { appSecret: 's', pageOrPhoneToken: 'token' });
      mockFetchOnce(400, { error: { message: 'Número de teléfono inválido' } });

      const result = await adapter.sendTextMessage({
        channelAccountExternalId: 'PHONE_123',
        recipientExternalId: 'bad-number',
        text: 'Hola!',
        internalMessageId: 'internal-2',
      });

      expect(result.status).toBe('failed');
      expect(result.errorReason).toBe('Número de teléfono inválido');
    });

    it('Messenger: envía y devuelve el id de mensaje de la Graph API', async () => {
      const adapter = new MetaChannelAdapter('messenger', { appSecret: 's', pageOrPhoneToken: 'token' });
      mockFetchOnce(200, { message_id: 'mid.OUT1' });

      const result = await adapter.sendTextMessage({
        channelAccountExternalId: 'PAGE_1',
        recipientExternalId: 'USER_1',
        text: 'Hola!',
        internalMessageId: 'internal-3',
      });

      expect(result).toEqual({ externalMessageId: 'mid.OUT1', status: 'sent' });
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/me/messages?access_token='), expect.anything());
    });
  });

  describe('downloadAttachment', () => {
    it('WhatsApp: resuelve el media id a una URL y descarga el archivo', async () => {
      const adapter = new MetaChannelAdapter('whatsapp', { appSecret: 's', pageOrPhoneToken: 'token' });
      mockFetchOnce(200, { url: 'https://lookaside.example/media/1', mime_type: 'image/jpeg', file_size: 123 });
      mockFetchOnce(200, {});

      const result = await adapter.downloadAttachment({ channelAccountExternalId: 'PHONE_123', mediaUrl: 'MEDIA_ID_1' });
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('Instagram/Messenger: descarga directamente desde la URL del webhook', async () => {
      const adapter = new MetaChannelAdapter('instagram', { appSecret: 's', pageOrPhoneToken: 'token' });
      mockFetchOnce(200, {}, { 'content-type': 'image/png' });

      const result = await adapter.downloadAttachment({ channelAccountExternalId: 'IG_1', mediaUrl: 'https://cdn.example/img.png' });
      expect(result.mimeType).toBe('image/png');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
