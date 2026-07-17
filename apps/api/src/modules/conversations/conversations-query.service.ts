import { Injectable } from '@nestjs/common';
import type { ListConversationsQuery, SessionUser } from '@birvo/contracts';
import type { Prisma } from '@birvo/database';
import { PrismaService } from '../../database/prisma.service';
import { ConversationLookupService } from './conversation-lookup.service';

@Injectable()
export class ConversationsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lookup: ConversationLookupService,
  ) {}

  async list(user: SessionUser, query: ListConversationsQuery) {
    const canViewAll = user.permissions.includes('conversations:view_all');

    const where: Prisma.ConversationWhereInput = { organizationId: user.organizationId };

    if (!canViewAll) {
      where.assignedUserId = user.userId;
    } else if (query.assignedUserId === 'me') {
      where.assignedUserId = user.userId;
    } else if (query.assignedUserId === 'unassigned') {
      where.assignedUserId = null;
    } else if (query.assignedUserId) {
      const assignee = await this.prisma.client.user.findUnique({ where: { publicId: query.assignedUserId } });
      where.assignedUserId = assignee?.id ?? '__none__';
    }

    if (query.status) where.status = query.status;
    if (query.unreadOnly) where.unreadCount = { gt: 0 };

    if (query.channelAccountId) {
      const channel = await this.prisma.client.channelAccount.findFirst({
        where: { publicId: query.channelAccountId, organizationId: user.organizationId },
      });
      where.channelAccountId = channel?.id ?? '__none__';
    }

    if (query.tagId) {
      const tag = await this.prisma.client.tag.findFirst({
        where: { publicId: query.tagId, organizationId: user.organizationId },
      });
      where.tags = { some: { tagId: tag?.id ?? '__none__' } };
    }

    if (query.search) {
      where.contact = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const take = query.pageSize;
    const skip = (query.page - 1) * take;

    const [items, total] = await Promise.all([
      this.prisma.client.conversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take,
        include: {
          contact: true,
          channelAccount: true,
          assignedUser: { select: { publicId: true, name: true, avatarUrl: true } },
          tags: { include: { tag: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.client.conversation.count({ where }),
    ]);

    return {
      items: items.map((c) => this.toSummaryDto(c)),
      page: query.page,
      pageSize: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  async getById(user: SessionUser, conversationPublicId: string) {
    const conversation = await this.lookup.findOwnedOrThrow(user.organizationId, conversationPublicId, {
      contact: true,
      channelAccount: true,
      assignedUser: { select: { publicId: true, name: true, avatarUrl: true } },
      tags: { include: { tag: true } },
    });
    this.lookup.assertCanView(user, conversation);
    return this.toDetailDto(conversation);
  }

  toSummaryDto(conversation: {
    publicId: string;
    status: string;
    priority: string;
    aiMode: string;
    unreadCount: number;
    lastMessageAt: Date;
    contact: { publicId: string; name: string; avatarUrl: string | null; phone: string | null };
    channelAccount: { publicId: string; provider: string; displayName: string };
    assignedUser: { publicId: string; name: string; avatarUrl: string | null } | null;
    tags: Array<{ tag: { publicId: string; name: string; color: string } }>;
    messages?: Array<{ content: string; messageType: string; direction: string; createdAt: Date }>;
  }) {
    return {
      id: conversation.publicId,
      status: conversation.status,
      priority: conversation.priority,
      aiMode: conversation.aiMode,
      unreadCount: conversation.unreadCount,
      lastMessageAt: conversation.lastMessageAt,
      contact: {
        id: conversation.contact.publicId,
        name: conversation.contact.name,
        avatarUrl: conversation.contact.avatarUrl,
        phone: conversation.contact.phone,
      },
      channel: {
        id: conversation.channelAccount.publicId,
        provider: conversation.channelAccount.provider,
        displayName: conversation.channelAccount.displayName,
      },
      assignedUser: conversation.assignedUser
        ? { id: conversation.assignedUser.publicId, name: conversation.assignedUser.name, avatarUrl: conversation.assignedUser.avatarUrl }
        : null,
      tags: conversation.tags.map((t) => ({ id: t.tag.publicId, name: t.tag.name, color: t.tag.color })),
      lastMessage: conversation.messages?.[0]
        ? {
            content: conversation.messages[0].content,
            type: conversation.messages[0].messageType,
            direction: conversation.messages[0].direction,
            createdAt: conversation.messages[0].createdAt,
          }
        : null,
    };
  }

  toDetailDto(conversation: Parameters<ConversationsQueryService['toSummaryDto']>[0] & { id: string }) {
    return this.toSummaryDto(conversation);
  }
}
