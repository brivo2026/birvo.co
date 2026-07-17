import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@birvo/contracts';
import { SocketEvent, organizationRoom } from '@birvo/contracts';
import type { Prisma } from '@birvo/database';
import { PrismaService } from '../../database/prisma.service';
import { RealtimePublisherService } from '../../realtime/realtime-publisher.service';

@Injectable()
export class ConversationLookupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimePublisherService,
  ) {}

  async findOwnedOrThrow<I extends Prisma.ConversationInclude = Record<string, never>>(
    organizationId: string,
    publicId: string,
    include?: I,
  ): Promise<Prisma.ConversationGetPayload<{ include: I }>> {
    const conversation = await this.prisma.client.conversation.findFirst({
      where: { publicId, organizationId },
      include,
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada.');
    return conversation as Prisma.ConversationGetPayload<{ include: I }>;
  }

  assertCanView(user: SessionUser, conversation: { assignedUserId: string | null }) {
    const canViewAll = user.permissions.includes('conversations:view_all');
    if (!canViewAll && conversation.assignedUserId !== user.userId) {
      throw new ForbiddenException('No tienes acceso a esta conversación.');
    }
  }

  async emitConversationUpdated(organizationId: string, conversationId: string) {
    const conversation = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
      include: { tags: { include: { tag: true } }, assignedUser: { select: { publicId: true, name: true } } },
    });
    if (!conversation) return;
    await this.realtime.publish(SocketEvent.CONVERSATION_UPDATED, organizationRoom(organizationId), {
      conversationId: conversation.publicId,
      status: conversation.status,
      priority: conversation.priority,
      aiMode: conversation.aiMode,
      tags: conversation.tags.map((t) => ({ id: t.tag.publicId, name: t.tag.name, color: t.tag.color })),
      assignedUser: conversation.assignedUser
        ? { id: conversation.assignedUser.publicId, name: conversation.assignedUser.name }
        : null,
    });
  }
}
