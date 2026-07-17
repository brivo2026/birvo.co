import { Injectable } from '@nestjs/common';
import type { SessionUser } from '@birvo/contracts';
import { SocketEvent, conversationRoom } from '@birvo/contracts';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimePublisherService } from '../../realtime/realtime-publisher.service';
import { ConversationLookupService } from './conversation-lookup.service';

@Injectable()
export class ConversationNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimePublisherService,
    private readonly lookup: ConversationLookupService,
  ) {}

  async listNotes(user: SessionUser, conversationPublicId: string) {
    const conversation = await this.lookup.findOwnedOrThrow(user.organizationId, conversationPublicId);
    const notes = await this.prisma.client.internalNote.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      include: { authorUser: { select: { name: true, avatarUrl: true } } },
    });
    return notes.map((n) => ({
      id: n.publicId,
      body: n.body,
      author: { name: n.authorUser.name, avatarUrl: n.authorUser.avatarUrl },
      createdAt: n.createdAt,
    }));
  }

  async addNote(user: SessionUser, conversationPublicId: string, body: string) {
    const conversation = await this.lookup.findOwnedOrThrow(user.organizationId, conversationPublicId);
    const note = await this.prisma.client.internalNote.create({
      data: { organizationId: user.organizationId, conversationId: conversation.id, authorUserId: user.userId, body },
      include: { authorUser: { select: { name: true, avatarUrl: true } } },
    });

    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: 'create',
      entityType: 'internal_note',
      entityId: note.id,
    });

    await this.realtime.publish(SocketEvent.CONVERSATION_UPDATED, conversationRoom(conversation.publicId), {
      conversationId: conversation.publicId,
      newNote: { id: note.publicId, body: note.body, author: note.authorUser.name },
    });

    return { id: note.publicId, body: note.body, author: { name: note.authorUser.name }, createdAt: note.createdAt };
  }
}
