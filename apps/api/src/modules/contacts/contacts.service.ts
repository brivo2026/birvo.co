import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateContactDto, ListContactsQuery, UpdateContactDto } from '@birvo/contracts';
import type { Prisma } from '@birvo/database';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, query: ListContactsQuery) {
    const where = {
      organizationId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { phone: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const take = query.pageSize;
    const skip = (query.page - 1) * take;

    const [items, total] = await Promise.all([
      this.prisma.client.contact.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: { _count: { select: { conversations: true } } },
      }),
      this.prisma.client.contact.count({ where }),
    ]);

    return {
      items: items.map((c) => this.toDto(c)),
      page: query.page,
      pageSize: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  async getById(organizationId: string, contactPublicId: string) {
    const contact = await this.prisma.client.contact.findFirst({
      where: { publicId: contactPublicId, organizationId },
      include: {
        identities: { include: { channelAccount: true } },
        conversations: { orderBy: { lastMessageAt: 'desc' }, take: 10 },
      },
    });
    if (!contact) throw new NotFoundException('Contacto no encontrado.');
    return {
      ...this.toDto(contact),
      identities: contact.identities.map((i) => ({
        provider: i.provider,
        username: i.username,
        channel: i.channelAccount.displayName,
      })),
      recentConversations: contact.conversations.map((c) => ({
        id: c.publicId,
        status: c.status,
        lastMessageAt: c.lastMessageAt,
      })),
    };
  }

  async create(organizationId: string, dto: CreateContactDto) {
    const contact = await this.prisma.client.contact.create({
      data: {
        organizationId,
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        // Cast justificado: `metadata` es un mapa arbitrario definido por
        // quien crea el contacto (Zod solo garantiza que sea un
        // Record<string, unknown> serializable), Prisma exige InputJsonValue.
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
    return this.toDto(contact);
  }

  async update(organizationId: string, contactPublicId: string, dto: UpdateContactDto) {
    const contact = await this.prisma.client.contact.findFirst({
      where: { publicId: contactPublicId, organizationId },
    });
    if (!contact) throw new NotFoundException('Contacto no encontrado.');

    const updated = await this.prisma.client.contact.update({
      where: { id: contact.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
        ...(dto.metadata !== undefined ? { metadata: dto.metadata as Prisma.InputJsonValue } : {}),
      },
    });
    return this.toDto(updated);
  }

  private toDto(contact: {
    publicId: string;
    name: string;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
    _count?: { conversations: number };
  }) {
    return {
      id: contact.publicId,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      avatarUrl: contact.avatarUrl,
      metadata: contact.metadata,
      conversationsCount: contact._count?.conversations ?? undefined,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }
}
