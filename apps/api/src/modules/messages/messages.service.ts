import { Injectable, NotFoundException } from '@nestjs/common';
import type { ListMessagesQuery, SendMessageDto, SessionUser } from '@birvo/contracts';
import { SocketEvent, organizationRoom } from '@birvo/contracts';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimePublisherService } from '../../realtime/realtime-publisher.service';
import { QueueService } from '../../queue/queue.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimePublisherService,
    private readonly queue: QueueService,
  ) {}

  async list(user: SessionUser, conversationPublicId: string, query: ListMessagesQuery) {
    const conversation = await this.prisma.client.conversation.findFirst({
      where: { publicId: conversationPublicId, organizationId: user.organizationId },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada.');

    let cursorMessage: { createdAt: Date } | null = null;
    if (query.cursor) {
      cursorMessage = await this.prisma.client.message.findFirst({
        where: { publicId: query.cursor, conversationId: conversation.id },
        select: { createdAt: true },
      });
    }

    const messages = await this.prisma.client.message.findMany({
      where: {
        conversationId: conversation.id,
        ...(cursorMessage ? { createdAt: { lt: cursorMessage.createdAt } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      include: { attachments: true, senderUser: { select: { name: true, avatarUrl: true } } },
    });

    return {
      items: messages.reverse().map((m) => this.toDto(m)),
      nextCursor: messages.length === query.limit ? messages[0]?.publicId : null,
    };
  }

  async send(user: SessionUser, conversationPublicId: string, dto: SendMessageDto) {
    const conversation = await this.prisma.client.conversation.findFirst({
      where: { publicId: conversationPublicId, organizationId: user.organizationId },
      include: { channelAccount: true },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada.');

    const message = await this.prisma.client.message.create({
      data: {
        organizationId: user.organizationId,
        conversationId: conversation.id,
        direction: 'outbound',
        senderType: 'user',
        senderUserId: user.userId,
        messageType: dto.messageType,
        content: dto.content,
        status: 'pending',
        replyToMessageId: dto.replyToMessageId,
      },
      include: { senderUser: { select: { name: true, avatarUrl: true } } },
    });

    await this.prisma.client.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), status: conversation.status === 'requires_human' ? 'open' : conversation.status },
    });

    // Un agente respondió: cancelar cualquier temporizador de inactividad/IA pendiente (ver §10).
    await this.queue.cancelInactivityTimeout(conversation.id);

    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: 'send_message',
      entityType: 'message',
      entityId: message.id,
      metadata: { conversationId: conversation.publicId },
    });

    await this.realtime.publish(SocketEvent.MESSAGE_CREATED, organizationRoom(user.organizationId), {
      conversationId: conversation.publicId,
      message: this.toDto(message),
    });

    await this.queue.enqueueOutboundMessage({ messageId: message.id, organizationId: user.organizationId });

    return this.toDto(message);
  }

  private toDto(message: {
    publicId: string;
    direction: string;
    senderType: string;
    senderUser: { name: string; avatarUrl: string | null } | null;
    messageType: string;
    content: string;
    status: string;
    replyToMessageId: string | null;
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    createdAt: Date;
    attachments?: Array<{
      publicId: string;
      type: string;
      filename: string;
      mimeType: string;
      size: number;
      duration: number | null;
      transcriptionStatus: string;
      transcriptionText: string | null;
    }>;
  }) {
    return {
      id: message.publicId,
      direction: message.direction,
      senderType: message.senderType,
      senderName: message.senderUser?.name ?? null,
      messageType: message.messageType,
      content: message.content,
      status: message.status,
      sentAt: message.sentAt,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
      createdAt: message.createdAt,
      attachments: (message.attachments ?? []).map((a) => ({
        id: a.publicId,
        type: a.type,
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.size,
        duration: a.duration,
        transcriptionStatus: a.transcriptionStatus,
        transcriptionText: a.transcriptionText,
      })),
    };
  }
}
