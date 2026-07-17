import { SandboxChannelAdapter, SandboxTemporaryError, type SandboxInboundPayload } from './sandbox.adapter';

describe('SandboxChannelAdapter', () => {
  const adapter = new SandboxChannelAdapter();

  it('normaliza un mensaje entrante de texto al modelo NormalizedInboundMessage', async () => {
    const payload: SandboxInboundPayload = {
      type: 'inbound_message',
      channelAccountExternalId: 'sandbox-main',
      externalUserId: 'sandbox-contact-1',
      contactDisplayName: 'Laura Gómez',
      messageType: 'text',
      text: 'Hola BIRVO',
      externalMessageId: 'msg-1',
      sentAt: new Date().toISOString(),
    };

    const result = await adapter.normalizeWebhook(payload);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      provider: 'sandbox',
      externalMessageId: 'msg-1',
      externalUserId: 'sandbox-contact-1',
      text: 'Hola BIRVO',
    });
    expect(result.statusUpdates).toHaveLength(0);
  });

  it('normaliza una actualización de estado', async () => {
    const result = await adapter.normalizeWebhook({
      type: 'status_update',
      channelAccountExternalId: 'sandbox-main',
      externalMessageId: 'msg-1',
      status: 'delivered',
      occurredAt: new Date().toISOString(),
    });
    expect(result.statusUpdates).toHaveLength(1);
    expect(result.statusUpdates[0]!.status).toBe('delivered');
  });

  it('lanza SandboxTemporaryError cuando se solicita simular un error temporal', async () => {
    const payload: SandboxInboundPayload = {
      type: 'inbound_message',
      channelAccountExternalId: 'sandbox-main',
      externalUserId: 'sandbox-contact-1',
      messageType: 'text',
      text: 'Hola',
      externalMessageId: 'msg-2',
      sentAt: new Date().toISOString(),
      simulateTemporaryError: true,
    };

    await expect(adapter.normalizeWebhook(payload)).rejects.toBeInstanceOf(SandboxTemporaryError);
  });

  it('verifyWebhookSignature siempre es válido para el canal sandbox', async () => {
    const valid = await adapter.verifyWebhookSignature({ rawBody: '{}', signatureHeader: undefined, secret: '' });
    expect(valid).toBe(true);
  });

  it('sendTextMessage devuelve un externalMessageId único con estado sent', async () => {
    const result = await adapter.sendTextMessage({
      channelAccountExternalId: 'sandbox-main',
      recipientExternalId: 'sandbox-contact-1',
      text: 'Hola de vuelta',
      internalMessageId: 'internal-1',
    });
    expect(result.status).toBe('sent');
    expect(result.externalMessageId).toMatch(/^sandbox-out-/);
  });

  it('buildDeliveryProgressionPayloads genera delivered antes que read', () => {
    const [delivered, read] = SandboxChannelAdapter.buildDeliveryProgressionPayloads('sandbox-main', 'msg-1');
    expect(delivered.status).toBe('delivered');
    expect(read.status).toBe('read');
    expect(new Date(delivered.occurredAt).getTime()).toBeLessThan(new Date(read.occurredAt).getTime());
  });
});
