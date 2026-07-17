import type { Job } from 'bullmq';
import { Prisma } from '@birvo/database';
import {
  SocketEvent,
  organizationRoom,
  type NormalizedInboundMessage,
  type NormalizedStatusUpdate,
  type ProcessWebhookJob,
} from '@birvo/contracts';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { channelRegistry } from '../lib/channel-registry';
import { publishRealtimeEvent } from '../lib/realtime-publisher';
import { enqueueTranscription, scheduleInactivityTimeout } from '../lib/queue-producer';

const MESSAGE_TYPES_WITH_ATTACHMENT = new Set(['image', 'audio', 'video', 'file']);

export async function processWebhookJob(job: Job<ProcessWebhookJob>): Promise<void> {
  const event = await prisma.webhookEvent.findUnique({ where: { id: job.data.webhookEventId } });
  if (!event) {
    logger.warn({ webhookEventId: job.data.webhookEventId }, 'WebhookEvent no encontrado, se ignora el job');
    return;
  }
  if (event.status === 'processed') {
    logger.debug({ webhookEventId: event.id }, 'WebhookEvent ya procesado, se ignora (idempotencia)');
    return;
  }

  await prisma.webhookEvent.update({
    where: { id: event.id },
    data: { status: 'processing', attempts: { increment: 1 } },
  });

  const adapter = channelRegistry.get(event.provider);

  let normalized;
  try {
    normalized = await adapter.normalizeWebhook(event.payload);
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: 'failed', lastError: (error as Error).message },
    });
    throw error; // BullMQ reintentará con backoff exponencial; ver dead-letter.ts al agotar intentos.
  }

  for (const message of normalized.messages) {
    await processInboundMessage(event.organizationId, message).catch((error) => {
      logger.error({ err: (error as Error).message, event: event.id }, 'Error procesando mensaje normalizado');
      throw error;
    });
  }

  for (const statusUpdate of normalized.statusUpdates) {
    await processStatusUpdate(statusUpdate).catch((error) => {
      logger.error({ err: (error as Error).message, event: event.id }, 'Error procesando actualización de estado');
    });
  }

  await prisma.webhookEvent.update({
    where: { id: event.id },
    data: { status: 'processed', processedAt: new Date() },
  });
}

async function processInboundMessage(
  organizationIdHint: string | null,
  normalized: NormalizedInboundMessage,
): Promise<void> {
  const channelAccount = await prisma.channelAccount.findFirst({
    where: {
      provider: normalized.provider,
      externalAccountId: normalized.channelAccountExternalId,
      ...(organizationIdHint ? { organizationId: organizationIdHint } : {}),
    },
  });
  if (!channelAccount) {
    logger.warn({ normalized }, 'No se encontró ChannelAccount para el mensaje entrante; se descarta');
    return;
  }
  const organizationId = channelAccount.organizationId;

  let identity = await prisma.contactIdentity.findUnique({
    where: { channelAccountId_externalUserId: { channelAccountId: channelAccount.id, externalUserId: normalized.externalUserId } },
    include: { contact: true },
  });

  let contact = identity?.contact;
  if (!identity || !contact) {
    contact = await prisma.contact.create({
      data: {
        organizationId,
        name: normalized.contactDisplayName || normalized.externalUsername || 'Contacto sin nombre',
        avatarUrl: normalized.contactAvatarUrl,
      },
    });
    identity = await prisma.contactIdentity.create({
      data: {
        contactId: contact.id,
        channelAccountId: channelAccount.id,
        provider: normalized.provider,
        externalUserId: normalized.externalUserId,
        username: normalized.externalUsername,
      },
      include: { contact: true },
    });
  }

  let conversation = await prisma.conversation.findFirst({
    where: { organizationId, contactId: contact.id, channelAccountId: channelAccount.id },
    orderBy: { lastMessageAt: 'desc' },
  });

  const aiConfig = await prisma.aiConfiguration.findUnique({ where: { organizationId } });
  const defaultAiMode = aiConfig?.aiEnabled ? (aiConfig.mode as 'suggestion' | 'automatic') : 'off';

  let isNewConversation = false;
  if (!conversation || conversation.status === 'closed') {
    conversation = await prisma.conversation.create({
      data: {
        organizationId,
        contactId: contact.id,
        channelAccountId: channelAccount.id,
        status: 'open',
        aiMode: defaultAiMode,
      },
    });
    isNewConversation = true;
  } else if (conversation.status === 'resolved') {
    conversation = await prisma.conversation.update({ where: { id: conversation.id }, data: { status: 'open' } });
  }

  let createdMessage;
  try {
    createdMessage = await prisma.message.create({
      data: {
        organizationId,
        conversationId: conversation.id,
        direction: 'inbound',
        senderType: 'contact',
        externalMessageId: normalized.externalMessageId,
        messageType: normalized.messageType,
        content: normalized.text ?? '',
        status: 'delivered',
        sentAt: normalized.sentAt,
        deliveredAt: new Date(),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      logger.info({ externalMessageId: normalized.externalMessageId }, 'Mensaje duplicado detectado a nivel de base de datos (idempotencia)');
      return;
    }
    throw error;
  }

  let createdAttachment: Awaited<ReturnType<typeof prisma.attachment.create>> | null = null;
  if (MESSAGE_TYPES_WITH_ATTACHMENT.has(normalized.messageType) && normalized.mediaUrl) {
    createdAttachment = await prisma.attachment.create({
      data: {
        organizationId,
        messageId: createdMessage.id,
        type: normalized.messageType as 'image' | 'audio' | 'video' | 'file',
        filename: normalized.mediaUrl.split('/').pop() ?? 'archivo',
        mimeType: normalized.mediaMimeType ?? 'application/octet-stream',
        size: 0,
        storageKey: `inbound/${organizationId}/${createdMessage.id}`,
        duration: normalized.mediaDurationSeconds ? Math.round(normalized.mediaDurationSeconds) : null,
        transcriptionStatus: normalized.messageType === 'audio' ? 'pending' : 'none',
      },
    });

    if (normalized.messageType === 'audio') {
      await enqueueTranscription({ attachmentId: createdAttachment.id, organizationId });
    }
  }

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
  });

  await publishRealtimeEvent(SocketEvent.MESSAGE_CREATED, organizationRoom(organizationId), {
    conversationId: conversation.publicId,
    message: {
      id: createdMessage.publicId,
      direction: 'inbound',
      senderType: 'contact',
      senderName: null,
      messageType: createdMessage.messageType,
      content: createdMessage.content,
      status: createdMessage.status,
      sentAt: createdMessage.sentAt,
      deliveredAt: createdMessage.deliveredAt,
      readAt: createdMessage.readAt,
      createdAt: createdMessage.createdAt,
      attachments: createdAttachment
        ? [
            {
              id: createdAttachment.publicId,
              type: createdAttachment.type,
              filename: createdAttachment.filename,
              mimeType: createdAttachment.mimeType,
              size: createdAttachment.size,
              duration: createdAttachment.duration,
              transcriptionStatus: createdAttachment.transcriptionStatus,
              transcriptionText: createdAttachment.transcriptionText,
            },
          ]
        : [],
    },
  });

  await publishRealtimeEvent(
    isNewConversation ? SocketEvent.CONVERSATION_CREATED : SocketEvent.CONVERSATION_UPDATED,
    organizationRoom(organizationId),
    {
      conversationId: conversation.publicId,
      contactName: contact.name,
      lastMessagePreview: createdMessage.content,
      unreadCount: conversation.unreadCount + 1,
    },
  );

  // Evaluación de automatizaciones: programar el temporizador de inactividad / IA (§10).
  if (defaultAiMode !== 'off' && aiConfig) {
    const delayMs = aiConfig.inactivityMinutes * 60_000;
    await scheduleInactivityTimeout(
      { conversationId: conversation.id, organizationId, triggeredByMessageId: createdMessage.id },
      delayMs,
    );
    await prisma.automationRun.create({
      data: {
        organizationId,
        conversationId: conversation.id,
        status: 'scheduled',
        scheduledFor: new Date(Date.now() + delayMs),
        bullJobId: `inactivity:${conversation.id}`,
      },
    });
  }
}

async function processStatusUpdate(update: NormalizedStatusUpdate): Promise<void> {
  const message = await prisma.message.findFirst({
    where: { externalMessageId: update.externalMessageId },
    include: { conversation: true },
  });
  if (!message) {
    logger.warn({ update }, 'No se encontró el mensaje para la actualización de estado');
    return;
  }

  const data: Prisma.MessageUpdateInput = { status: update.status };
  if (update.status === 'delivered') data.deliveredAt = update.occurredAt;
  if (update.status === 'read') data.readAt = update.occurredAt;
  if (update.status === 'failed') data.failureReason = update.errorReason;

  await prisma.message.update({ where: { id: message.id }, data });

  await publishRealtimeEvent(SocketEvent.MESSAGE_STATUS_UPDATED, organizationRoom(message.organizationId), {
    conversationId: message.conversation.publicId,
    messageId: message.publicId,
    status: update.status,
  });
}
