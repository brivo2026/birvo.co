import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AssignConversationDto,
  SessionUser,
  UpdateAiModeDto,
  UpdateConversationPriorityDto,
  UpdateConversationStatusDto,
} from '@birvo/contracts';
import { SocketEvent, conversationRoom, organizationRoom } from '@birvo/contracts';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimePublisherService } from '../../realtime/realtime-publisher.service';
import { QueueService } from '../../queue/queue.service';
import { ConversationLookupService } from './conversation-lookup.service';

@Injectable()
export class ConversationsMutationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimePublisherService,
    private readonly queue: QueueService,
    private readonly lookup: ConversationLookupService,
  ) {}

  async markAsRead(user: SessionUser, conversationPublicId: string) {
    const conversation = await this.lookup.findOwnedOrThrow(user.organizationId, conversationPublicId);
    await this.prisma.client.conversation.update({
      where: { id: conversation.id },
      data: { unreadCount: 0 },
    });
    await this.lookup.emitConversationUpdated(user.organizationId, conversation.id);
    return { success: true };
  }

  async assign(user: SessionUser, conversationPublicId: string, dto: AssignConversationDto) {
    const conversation = await this.lookup.findOwnedOrThrow(user.organizationId, conversationPublicId);

    let assignedUserId: string | null = null;
    if (dto.userId) {
      const membership = await this.prisma.client.membership.findFirst({
        where: { organizationId: user.organizationId, user: { publicId: dto.userId }, status: 'active' },
        include: { user: true },
      });
      if (!membership) throw new BadRequestException('El usuario a asignar no pertenece a esta organización.');
      assignedUserId = membership.userId;
    }

    const updated = await this.prisma.client.conversation.update({
      where: { id: conversation.id },
      data: { assignedUserId },
      include: { assignedUser: { select: { publicId: true, name: true, avatarUrl: true } } },
    });

    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: 'assign',
      entityType: 'conversation',
      entityId: conversation.id,
      metadata: { assignedUserId: dto.userId },
    });

    await this.realtime.publish(SocketEvent.CONVERSATION_ASSIGNED, organizationRoom(user.organizationId), {
      conversationId: updated.publicId,
      assignedUser: updated.assignedUser
        ? { id: updated.assignedUser.publicId, name: updated.assignedUser.name, avatarUrl: updated.assignedUser.avatarUrl }
        : null,
    });

    if (assignedUserId) {
      await this.prisma.client.notification.create({
        data: {
          organizationId: user.organizationId,
          userId: assignedUserId,
          conversationId: conversation.id,
          type: 'conversation_assigned',
          title: 'Nueva conversación asignada',
          body: 'Se te asignó una conversación en BIRVO.',
        },
      });
      await this.realtime.publish(SocketEvent.NOTIFICATION_CREATED, `user:${assignedUserId}`, {
        title: 'Nueva conversación asignada',
        conversationId: updated.publicId,
      });
    }

    return { success: true };
  }

  async updateStatus(user: SessionUser, conversationPublicId: string, dto: UpdateConversationStatusDto) {
    const conversation = await this.lookup.findOwnedOrThrow(user.organizationId, conversationPublicId);

    await this.prisma.client.conversation.update({
      where: { id: conversation.id },
      data: { status: dto.status },
    });

    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: 'status_change',
      entityType: 'conversation',
      entityId: conversation.id,
      metadata: { status: dto.status },
    });

    const event = dto.status === 'closed' ? SocketEvent.CONVERSATION_CLOSED : SocketEvent.CONVERSATION_UPDATED;
    await this.realtime.publish(event, organizationRoom(user.organizationId), {
      conversationId: conversation.publicId,
      status: dto.status,
    });

    if (dto.status !== 'requires_human') {
      // Si el equipo resuelve manualmente, no tiene sentido dejar un timer de IA pendiente.
      await this.queue.cancelInactivityTimeout(conversation.id);
    }

    return { success: true };
  }

  async updatePriority(user: SessionUser, conversationPublicId: string, dto: UpdateConversationPriorityDto) {
    const conversation = await this.lookup.findOwnedOrThrow(user.organizationId, conversationPublicId);
    await this.prisma.client.conversation.update({
      where: { id: conversation.id },
      data: { priority: dto.priority },
    });
    await this.lookup.emitConversationUpdated(user.organizationId, conversation.id);
    return { success: true };
  }

  async updateAiMode(user: SessionUser, conversationPublicId: string, dto: UpdateAiModeDto) {
    const conversation = await this.lookup.findOwnedOrThrow(user.organizationId, conversationPublicId);
    await this.prisma.client.conversation.update({
      where: { id: conversation.id },
      data: { aiMode: dto.aiMode },
    });
    await this.lookup.emitConversationUpdated(user.organizationId, conversation.id);
    return { success: true };
  }

  async addTag(user: SessionUser, conversationPublicId: string, tagPublicId: string) {
    const [conversation, tag] = await Promise.all([
      this.lookup.findOwnedOrThrow(user.organizationId, conversationPublicId),
      this.prisma.client.tag.findFirst({ where: { publicId: tagPublicId, organizationId: user.organizationId } }),
    ]);
    if (!tag) throw new NotFoundException('Etiqueta no encontrada.');

    await this.prisma.client.conversationTag.upsert({
      where: { conversationId_tagId: { conversationId: conversation.id, tagId: tag.id } },
      update: {},
      create: { conversationId: conversation.id, tagId: tag.id },
    });

    await this.lookup.emitConversationUpdated(user.organizationId, conversation.id);
    return { success: true };
  }

  async removeTag(user: SessionUser, conversationPublicId: string, tagPublicId: string) {
    const [conversation, tag] = await Promise.all([
      this.lookup.findOwnedOrThrow(user.organizationId, conversationPublicId),
      this.prisma.client.tag.findFirst({ where: { publicId: tagPublicId, organizationId: user.organizationId } }),
    ]);
    if (!tag) throw new NotFoundException('Etiqueta no encontrada.');

    await this.prisma.client.conversationTag.deleteMany({
      where: { conversationId: conversation.id, tagId: tag.id },
    });
    await this.lookup.emitConversationUpdated(user.organizationId, conversation.id);
    return { success: true };
  }
}
