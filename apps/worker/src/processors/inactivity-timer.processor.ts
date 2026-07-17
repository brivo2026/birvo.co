import type { Job } from 'bullmq';
import { Prisma } from '@birvo/database';
import { SocketEvent, conversationRoom, organizationRoom, type EvaluateInactivityTimeoutJob } from '@birvo/contracts';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { aiProvider } from '../lib/ai-provider';
import { publishRealtimeEvent } from '../lib/realtime-publisher';
import { enqueueOutboundMessage } from '../lib/queue-producer';

function isWithinBusinessHours(config: { businessHoursStart: string; businessHoursEnd: string; businessDays: number[] }, timezone: string): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const weekdayShort = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayNumber = weekdayMap[weekdayShort] ?? 1;

  if (!config.businessDays.includes(dayNumber)) return false;

  const [startH = 0, startM = 0] = config.businessHoursStart.split(':').map(Number);
  const [endH = 0, endM = 0] = config.businessHoursEnd.split(':').map(Number);
  const nowMinutes = hour * 60 + minute;
  return nowMinutes >= startH * 60 + startM && nowMinutes <= endH * 60 + endM;
}

export async function evaluateInactivityTimeout(job: Job<EvaluateInactivityTimeoutJob>): Promise<void> {
  const { conversationId, organizationId, triggeredByMessageId } = job.data;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { contact: true, organization: true },
  });
  if (!conversation || conversation.status === 'closed' || conversation.status === 'resolved') {
    logger.debug({ conversationId }, 'Conversación cerrada/resuelta, se omite evaluación de IA');
    return;
  }

  const triggerMessage = await prisma.message.findUnique({ where: { id: triggeredByMessageId } });

  // Doble verificación: si un agente ya respondió después del mensaje que
  // disparó este timer, se cancela (además de la cancelación explícita en
  // QueueService al enviar una respuesta humana). Ver §10.
  if (triggerMessage) {
    const humanReply = await prisma.message.findFirst({
      where: {
        conversationId,
        direction: 'outbound',
        senderType: 'user',
        createdAt: { gt: triggerMessage.createdAt },
      },
    });
    if (humanReply) {
      logger.debug({ conversationId }, 'Un agente ya respondió; se cancela la evaluación de IA');
      return;
    }
  }

  const aiConfig = await prisma.aiConfiguration.findUnique({ where: { organizationId } });
  if (!aiConfig || !aiConfig.aiEnabled || conversation.aiMode === 'off') {
    return;
  }

  if (!isWithinBusinessHours(aiConfig, conversation.organization.timezone)) {
    await recordExecution(conversation.id, organizationId, { input: { reason: 'fuera de horario laboral' } }, 'skipped_rules', []);
    return;
  }

  if (conversation.aiMode === 'automatic' && conversation.automaticReplyCount >= aiConfig.maximumAutomaticReplies) {
    await recordExecution(
      conversation.id,
      organizationId,
      { input: { reason: 'máximo de respuestas automáticas alcanzado' } },
      'skipped_rules',
      [],
    );
    return;
  }

  const historyMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const history = historyMessages
    .reverse()
    .map((m) => ({ senderType: m.senderType, content: m.content, createdAt: m.createdAt }));

  const reply = await aiProvider.generateReply({
    conversationId: conversation.publicId,
    history,
    contactName: conversation.contact.name,
    escalationKeywords: aiConfig.escalationKeywords,
    excludedTopics: aiConfig.excludedTopics,
  });

  if (!reply.safety.isSafeToAutomate || !reply.text) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { status: 'requires_human' } });

    if (conversation.assignedUserId) {
      await prisma.notification.create({
        data: {
          organizationId,
          userId: conversation.assignedUserId,
          conversationId: conversation.id,
          type: 'conversation_requires_human',
          title: 'Conversación requiere atención humana',
          body: reply.safety.reason ?? 'La IA detectó una situación sensible y no respondió automáticamente.',
        },
      });
      await publishRealtimeEvent(SocketEvent.NOTIFICATION_CREATED, `user:${conversation.assignedUserId}`, {
        title: 'Conversación requiere atención humana',
        conversationId: conversation.publicId,
      });
    }

    await publishRealtimeEvent(SocketEvent.CONVERSATION_UPDATED, organizationRoom(organizationId), {
      conversationId: conversation.publicId,
      status: 'requires_human',
    });

    await recordExecution(
      conversation.id,
      organizationId,
      { input: { history }, output: null },
      'skipped_safety',
      reply.safety.flags,
      reply,
    );
    return;
  }

  if (conversation.aiMode === 'suggestion') {
    await recordExecution(
      conversation.id,
      organizationId,
      { input: { history }, output: { text: reply.text } },
      'suggested',
      reply.safety.flags,
      reply,
    );

    await publishRealtimeEvent(SocketEvent.AI_SUGGESTION_CREATED, conversationRoom(conversation.publicId), {
      conversationId: conversation.publicId,
      suggestion: reply.text,
      confidence: reply.confidence,
    });

    if (conversation.assignedUserId) {
      await prisma.notification.create({
        data: {
          organizationId,
          userId: conversation.assignedUserId,
          conversationId: conversation.id,
          type: 'ai_suggestion',
          title: 'BIRVO IA sugiere una respuesta',
          body: reply.text.slice(0, 140),
        },
      });
      await publishRealtimeEvent(SocketEvent.NOTIFICATION_CREATED, `user:${conversation.assignedUserId}`, {
        title: 'BIRVO IA sugiere una respuesta',
        conversationId: conversation.publicId,
      });
    }
    return;
  }

  // Modo automático: se genera y envía la respuesta.
  const aiMessage = await prisma.message.create({
    data: {
      organizationId,
      conversationId: conversation.id,
      direction: 'outbound',
      senderType: 'ai',
      messageType: 'text',
      content: reply.text,
      status: 'pending',
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { automaticReplyCount: { increment: 1 }, lastMessageAt: new Date() },
  });

  await recordExecution(
    conversation.id,
    organizationId,
    { input: { history }, output: { text: reply.text } },
    'sent',
    reply.safety.flags,
    reply,
  );

  await publishRealtimeEvent(SocketEvent.MESSAGE_CREATED, conversationRoom(conversation.publicId), {
    id: aiMessage.publicId,
    direction: 'outbound',
    senderType: 'ai',
    content: aiMessage.content,
    status: 'pending',
    createdAt: aiMessage.createdAt,
  });

  await enqueueOutboundMessage({ messageId: aiMessage.id, organizationId });
}

async function recordExecution(
  conversationId: string,
  organizationId: string,
  data: { input: unknown; output?: unknown },
  result: 'suggested' | 'sent' | 'skipped_safety' | 'skipped_rules' | 'failed',
  safetyFlags: string[],
  reply?: { provider: string; model: string; promptVersion: string; latencyMs: number; tokensUsed?: number },
): Promise<void> {
  await prisma.aiExecution.create({
    data: {
      organizationId,
      conversationId,
      provider: reply?.provider ?? 'mock',
      model: reply?.model ?? 'birvo-mock-rules-v1',
      promptVersion: reply?.promptVersion ?? 'birvo-mock-v1',
      // Cast justificado: el registro de auditoría de IA acepta cualquier
      // entrada/salida serializable (historial de mensajes, texto sugerido,
      // motivo de bloqueo de seguridad), cuya forma varía según el caso.
      input: data.input as Prisma.InputJsonValue,
      output: data.output === undefined || data.output === null ? Prisma.JsonNull : (data.output as Prisma.InputJsonValue),
      latencyMs: reply?.latencyMs,
      tokensUsed: reply?.tokensUsed,
      result,
      safetyFlags,
    },
  });
}
