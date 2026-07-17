import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionUser } from '@birvo/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';

/** Búsqueda de contenido transcrito de notas de voz (ver §11 del brief). */
@ApiTags('transcriptions')
@Controller({ path: 'transcriptions', version: '1' })
export class TranscriptionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('search')
  async search(@CurrentUser() user: SessionUser, @Query('q') q: string) {
    if (!q || q.trim().length < 2) return { items: [] };

    const attachments = await this.prisma.client.attachment.findMany({
      where: {
        organizationId: user.organizationId,
        transcriptionStatus: 'completed',
        transcriptionText: { contains: q, mode: 'insensitive' },
      },
      include: { message: { include: { conversation: { include: { contact: true } } } } },
      take: 25,
    });

    return {
      items: attachments.map((a) => ({
        attachmentId: a.publicId,
        conversationId: a.message.conversation.publicId,
        contactName: a.message.conversation.contact.name,
        transcriptionText: a.transcriptionText,
        createdAt: a.createdAt,
      })),
    };
  }
}
