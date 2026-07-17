jest.mock('../lib/prisma', () => ({
  prisma: {
    webhookEvent: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('../lib/channel-registry', () => ({
  channelRegistry: { get: jest.fn() },
}));

jest.mock('../lib/realtime-publisher', () => ({ publishRealtimeEvent: jest.fn() }));
jest.mock('../lib/queue-producer', () => ({ enqueueTranscription: jest.fn(), scheduleInactivityTimeout: jest.fn() }));
jest.mock('../lib/logger', () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
  env: { NODE_ENV: 'test' },
}));

import { processWebhookJob } from './webhook.processor';
import { prisma } from '../lib/prisma';
import { channelRegistry } from '../lib/channel-registry';

describe('processWebhookJob — idempotencia', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ignora el job si el WebhookEvent no existe (fue borrado o el id es inválido)', async () => {
    (prisma.webhookEvent.findUnique as jest.Mock).mockResolvedValue(null);

    await processWebhookJob({ data: { webhookEventId: 'missing' } } as never);

    expect(prisma.webhookEvent.update).not.toHaveBeenCalled();
    expect(channelRegistry.get).not.toHaveBeenCalled();
  });

  it('no reprocesa un WebhookEvent que ya tiene status=processed (idempotencia)', async () => {
    (prisma.webhookEvent.findUnique as jest.Mock).mockResolvedValue({
      id: 'evt-1',
      status: 'processed',
      provider: 'sandbox',
      payload: {},
      organizationId: 'org-1',
    });

    await processWebhookJob({ data: { webhookEventId: 'evt-1' } } as never);

    // Solo se consulta, nunca se vuelve a marcar "processing" ni se llama al adaptador.
    expect(prisma.webhookEvent.update).not.toHaveBeenCalled();
    expect(channelRegistry.get).not.toHaveBeenCalled();
  });
});
