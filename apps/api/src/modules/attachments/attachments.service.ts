import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@birvo/contracts';
import { PrismaService } from '../../database/prisma.service';
import { STORAGE_PROVIDER, type StorageProvider } from '../../storage/storage-provider.interface';
import { QueueService } from '../../queue/queue.service';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly queue: QueueService,
  ) {}

  async getDownloadUrl(user: SessionUser, attachmentPublicId: string) {
    const attachment = await this.prisma.client.attachment.findFirst({
      where: { publicId: attachmentPublicId, organizationId: user.organizationId },
    });
    if (!attachment) throw new NotFoundException('Adjunto no encontrado.');

    const url = await this.storage.getSignedUrl(attachment.storageKey);
    return { url, expiresInSeconds: 900 };
  }

  async retryTranscription(user: SessionUser, attachmentPublicId: string) {
    const attachment = await this.prisma.client.attachment.findFirst({
      where: { publicId: attachmentPublicId, organizationId: user.organizationId },
    });
    if (!attachment) throw new NotFoundException('Adjunto no encontrado.');

    await this.prisma.client.attachment.update({
      where: { id: attachment.id },
      data: { transcriptionStatus: 'pending' },
    });

    await this.queue.enqueueTranscription({ attachmentId: attachment.id, organizationId: user.organizationId });

    return { success: true };
  }
}
