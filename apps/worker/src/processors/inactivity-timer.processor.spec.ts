jest.mock('../lib/prisma', () => ({
  prisma: {
    conversation: { findUnique: jest.fn(), update: jest.fn() },
    message: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    aiConfiguration: { findUnique: jest.fn() },
    aiExecution: { create: jest.fn() },
    notification: { create: jest.fn() },
  },
}));
jest.mock('../lib/ai-provider', () => ({ aiProvider: { generateReply: jest.fn() } }));
jest.mock('../lib/realtime-publisher', () => ({ publishRealtimeEvent: jest.fn() }));
jest.mock('../lib/queue-producer', () => ({ enqueueOutboundMessage: jest.fn() }));
jest.mock('../lib/logger', () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
  env: { NODE_ENV: 'test' },
}));

import { evaluateInactivityTimeout } from './inactivity-timer.processor';
import { prisma } from '../lib/prisma';
import { aiProvider } from '../lib/ai-provider';

describe('evaluateInactivityTimeout — cancelación cuando un agente ya respondió', () => {
  beforeEach(() => jest.clearAllMocks());

  it('no genera ninguna ejecución de IA si un agente respondió después del mensaje disparador', async () => {
    (prisma.conversation.findUnique as jest.Mock).mockResolvedValue({
      id: 'conv-1',
      status: 'open',
      aiMode: 'suggestion',
      automaticReplyCount: 0,
      assignedUserId: 'user-1',
      contact: { name: 'Laura' },
      organization: { timezone: 'America/Bogota' },
    });
    (prisma.message.findUnique as jest.Mock).mockResolvedValue({
      id: 'trigger-msg',
      createdAt: new Date('2026-01-01T10:00:00Z'),
    });
    // Existe una respuesta humana posterior al mensaje disparador.
    (prisma.message.findFirst as jest.Mock).mockResolvedValue({ id: 'human-reply', createdAt: new Date('2026-01-01T10:01:00Z') });

    await evaluateInactivityTimeout({
      data: { conversationId: 'conv-1', organizationId: 'org-1', triggeredByMessageId: 'trigger-msg' },
    } as never);

    expect(aiProvider.generateReply).not.toHaveBeenCalled();
    expect(prisma.aiExecution.create).not.toHaveBeenCalled();
  });

  it('omite conversaciones ya cerradas o resueltas', async () => {
    (prisma.conversation.findUnique as jest.Mock).mockResolvedValue({ id: 'conv-2', status: 'closed' });

    await evaluateInactivityTimeout({
      data: { conversationId: 'conv-2', organizationId: 'org-1', triggeredByMessageId: 'trigger-msg' },
    } as never);

    expect(aiProvider.generateReply).not.toHaveBeenCalled();
  });
});
