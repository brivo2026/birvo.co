import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AnalyticsRange {
  from: Date;
  to: Date;
}

/**
 * Capa de servicio de analítica basada en consultas optimizadas sobre las
 * tablas transaccionales (sin almacén analítico independiente, ver §13 del
 * brief). Si el volumen lo exige en el futuro, esta clase es el punto de
 * extracción hacia un data warehouse sin tocar el resto del dominio.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(organizationId: string, range: AnalyticsRange) {
    const { from, to } = range;
    const db = this.prisma.client;

    const [
      conversationsReceived,
      conversationsOpen,
      conversationsClosed,
      messagesByChannel,
      conversationsByAgent,
      totalOutboundMessages,
      aiOutboundMessages,
      totalConversationsInRange,
      requiresHumanConversations,
      firstResponseSamples,
      resolutionSamples,
      messagesByHour,
    ] = await Promise.all([
      db.conversation.count({ where: { organizationId, createdAt: { gte: from, lte: to } } }),
      db.conversation.count({ where: { organizationId, status: { in: ['open', 'pending', 'requires_human'] } } }),
      db.conversation.count({
        where: { organizationId, status: { in: ['closed', 'resolved'] }, updatedAt: { gte: from, lte: to } },
      }),
      db.message.groupBy({
        by: ['conversationId'],
        where: { organizationId, createdAt: { gte: from, lte: to } },
        _count: true,
      }),
      db.conversation.groupBy({
        by: ['assignedUserId'],
        where: { organizationId, assignedUserId: { not: null } },
        _count: true,
      }),
      db.message.count({ where: { organizationId, direction: 'outbound', createdAt: { gte: from, lte: to } } }),
      db.message.count({
        where: { organizationId, direction: 'outbound', senderType: 'ai', createdAt: { gte: from, lte: to } },
      }),
      db.conversation.count({ where: { organizationId, createdAt: { gte: from, lte: to } } }),
      db.conversation.count({ where: { organizationId, status: 'requires_human' } }),
      db.$queryRaw<Array<{ conversation_id: string; seconds: number }>>`
        SELECT m1."conversationId" as conversation_id,
               EXTRACT(EPOCH FROM (MIN(m2."createdAt") - MIN(m1."createdAt"))) as seconds
        FROM "Message" m1
        JOIN "Message" m2 ON m2."conversationId" = m1."conversationId" AND m2.direction = 'outbound' AND m2."createdAt" > m1."createdAt"
        WHERE m1."organizationId" = ${organizationId} AND m1.direction = 'inbound'
        GROUP BY m1."conversationId"
        LIMIT 500
      `,
      db.$queryRaw<Array<{ seconds: number }>>`
        SELECT EXTRACT(EPOCH FROM (c."updatedAt" - c."createdAt")) as seconds
        FROM "Conversation" c
        WHERE c."organizationId" = ${organizationId} AND c.status IN ('closed', 'resolved')
        LIMIT 500
      `,
      db.$queryRaw<Array<{ hour: number; count: bigint }>>`
        SELECT EXTRACT(HOUR FROM "createdAt") as hour, COUNT(*) as count
        FROM "Message"
        WHERE "organizationId" = ${organizationId} AND "createdAt" BETWEEN ${from} AND ${to}
        GROUP BY hour
        ORDER BY hour
      `,
    ]);

    // Mensajes por canal requiere un join adicional; se resuelve con una consulta agrupada directa.
    const channelBreakdown = await db.message.findMany({
      where: { organizationId, createdAt: { gte: from, lte: to } },
      select: { conversation: { select: { channelAccount: { select: { provider: true } } } } },
    });
    const messagesByChannelMap = new Map<string, number>();
    for (const m of channelBreakdown) {
      const provider = m.conversation.channelAccount.provider;
      messagesByChannelMap.set(provider, (messagesByChannelMap.get(provider) ?? 0) + 1);
    }

    const agentIds = conversationsByAgent.map((c) => c.assignedUserId).filter((id): id is string => Boolean(id));
    const agents = await db.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true } });
    const agentNameById = new Map(agents.map((a) => [a.id, a.name]));

    const avgFirstResponseSeconds =
      firstResponseSamples.length > 0
        ? Math.round(firstResponseSamples.reduce((sum, s) => sum + Number(s.seconds), 0) / firstResponseSamples.length)
        : null;

    const avgResolutionSeconds =
      resolutionSamples.length > 0
        ? Math.round(resolutionSamples.reduce((sum, s) => sum + Number(s.seconds), 0) / resolutionSamples.length)
        : null;

    // "Satisfacción simulada": sin encuestas reales en el MVP, se deriva de
    // una heurística determinista (menor tiempo de resolución => mayor
    // satisfacción simulada) para poblar el dashboard de forma representativa.
    const simulatedSatisfaction =
      avgResolutionSeconds === null
        ? null
        : Math.max(60, Math.min(98, Math.round(98 - avgResolutionSeconds / 3600)));

    return {
      range: { from, to },
      conversationsReceived,
      conversationsOpen,
      conversationsClosed,
      avgFirstResponseSeconds,
      avgResolutionSeconds,
      messagesByChannel: Object.fromEntries(messagesByChannelMap),
      conversationsByAgent: conversationsByAgent.map((c) => ({
        agentId: c.assignedUserId,
        agentName: c.assignedUserId ? (agentNameById.get(c.assignedUserId) ?? 'Desconocido') : 'Sin asignar',
        conversations: c._count,
      })),
      aiRepliedPercentage:
        totalOutboundMessages > 0 ? Math.round((aiOutboundMessages / totalOutboundMessages) * 1000) / 10 : 0,
      transferredToHumanPercentage:
        totalConversationsInRange > 0
          ? Math.round((requiresHumanConversations / totalConversationsInRange) * 1000) / 10
          : 0,
      simulatedSatisfaction,
      busiestHours: messagesByHour.map((h) => ({ hour: Number(h.hour), count: Number(h.count) })),
      activeConversationThreads: messagesByChannel.length,
    };
  }
}
