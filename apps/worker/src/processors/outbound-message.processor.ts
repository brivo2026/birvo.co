import type { Job } from 'bullmq';
import { SocketEvent, conversationRoom, type SendOutboundMessageJob, type SimulateDeliveryProgressionJob } from '@birvo/contracts';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { channelRegistry } from '../lib/channel-registry';
import { publishRealtimeEvent } from '../lib/realtime-publisher';
import { enqueueDeliveryProgression } from '../lib/queue-producer';

export async function sendOutboundMessage(job: Job<SendOutboundMessageJob>): Promise<void> {
  const message = await prisma.message.findUnique({
    where: { id: job.data.messageId },
    include: {
      conversation: {
        include: {
          channelAccount: true,
          contact: { include: { identities: true } },
        },
      },
    },
  });
  if (!message) {
    logger.warn({ messageId: job.data.messageId }, 'Mensaje saliente no encontrado, se ignora el job');
    return;
  }
  if (message.status !== 'pending') {
    logger.debug({ messageId: message.id, status: message.status }, 'Mensaje ya procesado, se ignora (idempotencia)');
    return;
  }

  await prisma.message.update({ where: { id: message.id }, data: { status: 'queued' } });

  const channelAccount = message.conversation.channelAccount;
  const adapter = channelRegistry.get(channelAccount.provider);

  const identity = message.conversation.contact.identities.find((i) => i.channelAccountId === channelAccount.id);
  if (!identity) {
    await markFailed(message.id, message.conversation.publicId, 'No se encontró la identidad del contacto en este canal.');
    return;
  }

  try {
    const result = await adapter.sendTextMessage({
      channelAccountExternalId: channelAccount.externalAccountId,
      recipientExternalId: identity.externalUserId,
      text: message.content,
      internalMessageId: message.id,
    });

    if (result.status === 'failed') {
      await markFailed(message.id, message.conversation.publicId, result.errorReason ?? 'Envío rechazado por el proveedor.');
      return;
    }

    const sentAt = new Date();
    await prisma.message.update({
      where: { id: message.id },
      data: { status: 'sent', externalMessageId: result.externalMessageId, sentAt },
    });

    await publishRealtimeEvent(SocketEvent.MESSAGE_STATUS_UPDATED, conversationRoom(message.conversation.publicId), {
      messageId: message.publicId,
      status: 'sent',
    });

    if (channelAccount.provider === 'sandbox') {
      const now = Date.now();
      await enqueueDeliveryProgression(
        {
          messageId: message.id,
          organizationId: message.organizationId,
          channelAccountExternalId: channelAccount.externalAccountId,
          externalMessageId: result.externalMessageId,
          status: 'delivered',
        },
        1500,
      );
      await enqueueDeliveryProgression(
        {
          messageId: message.id,
          organizationId: message.organizationId,
          channelAccountExternalId: channelAccount.externalAccountId,
          externalMessageId: result.externalMessageId,
          status: 'read',
        },
        4000,
      );
      void now;
    }
  } catch (error) {
    await markFailed(message.id, message.conversation.publicId, (error as Error).message);
    throw error; // Permite que BullMQ reintente con backoff exponencial.
  }
}

export async function simulateDeliveryProgression(job: Job<SimulateDeliveryProgressionJob>): Promise<void> {
  const message = await prisma.message.findUnique({ where: { id: job.data.messageId }, include: { conversation: true } });
  if (!message) return;
  if (message.status === 'failed') return;
  if (job.data.status === 'delivered' && message.status !== 'sent') return; // ya avanzó más allá
  if (job.data.status === 'read' && message.status === 'read') return;

  const now = new Date();
  await prisma.message.update({
    where: { id: message.id },
    data: job.data.status === 'delivered' ? { status: 'delivered', deliveredAt: now } : { status: 'read', readAt: now },
  });

  await publishRealtimeEvent(SocketEvent.MESSAGE_STATUS_UPDATED, conversationRoom(message.conversation.publicId), {
    messageId: message.publicId,
    status: job.data.status,
  });
}

async function markFailed(messageId: string, conversationPublicId: string, reason: string): Promise<void> {
  await prisma.message.update({ where: { id: messageId }, data: { status: 'failed', failureReason: reason } });
  await publishRealtimeEvent(SocketEvent.MESSAGE_STATUS_UPDATED, conversationRoom(conversationPublicId), {
    messageId,
    status: 'failed',
    reason,
  });
}
