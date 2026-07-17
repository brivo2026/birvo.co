import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SandboxChannelAdapter, type SandboxInboundPayload } from '@birvo/channel-sdk';
import type { SessionUser, SimulateInboundMessageDto } from '@birvo/contracts';
import { PrismaService } from '../../database/prisma.service';
import { WebhookIngestionService } from '../webhooks/webhook-ingestion.service';
import { QueueService } from '../../queue/queue.service';

@Injectable()
export class DevSandboxService {
  private readonly adapter = new SandboxChannelAdapter();

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestion: WebhookIngestionService,
    private readonly queue: QueueService,
  ) {}

  async listDemoContacts(organizationId: string) {
    const contacts = await this.prisma.client.contact.findMany({
      where: { organizationId, identities: { some: { provider: 'sandbox' } } },
      include: { identities: { where: { provider: 'sandbox' } } },
      orderBy: { name: 'asc' },
    });
    return contacts.map((c) => ({ id: c.publicId, name: c.name, externalUserId: c.identities[0]?.externalUserId }));
  }

  async simulateInbound(user: SessionUser, dto: SimulateInboundMessageDto) {
    const channelAccount = await this.prisma.client.channelAccount.findFirst({
      where: { publicId: dto.channelAccountId, organizationId: user.organizationId, provider: 'sandbox' },
    });
    if (!channelAccount) throw new NotFoundException('Canal sandbox no encontrado.');

    let externalUserId: string;
    let contactDisplayName: string;

    if (dto.contactId) {
      const contact = await this.prisma.client.contact.findFirst({
        where: { publicId: dto.contactId, organizationId: user.organizationId },
        include: { identities: { where: { channelAccountId: channelAccount.id } } },
      });
      if (!contact) throw new NotFoundException('Contacto no encontrado.');
      externalUserId = contact.identities[0]?.externalUserId ?? `sandbox-${contact.id}`;
      contactDisplayName = contact.name;
    } else if (dto.contactName) {
      externalUserId = `sandbox-new-${randomUUID().slice(0, 8)}`;
      contactDisplayName = dto.contactName;
    } else {
      throw new BadRequestException('Debes indicar contactId o contactName.');
    }

    let externalMessageId = `sandbox-in-${randomUUID()}`;

    if (dto.simulateDuplicate) {
      const lastMessage = await this.prisma.client.message.findFirst({
        where: { organizationId: user.organizationId, direction: 'inbound', externalMessageId: { not: null } },
        orderBy: { createdAt: 'desc' },
      });
      if (lastMessage?.externalMessageId) {
        externalMessageId = lastMessage.externalMessageId;
      }
    }

    const rawPayload: SandboxInboundPayload = {
      type: 'inbound_message',
      channelAccountExternalId: channelAccount.externalAccountId,
      externalUserId,
      contactDisplayName,
      messageType: dto.messageType,
      text: dto.text,
      mediaUrl: dto.messageType !== 'text' ? `https://sandbox.birvo.local/media/${randomUUID()}.bin` : undefined,
      mediaMimeType:
        dto.messageType === 'audio' ? 'audio/ogg' : dto.messageType === 'image' ? 'image/jpeg' : undefined,
      mediaDurationSeconds: dto.messageType === 'audio' ? 7 : undefined,
      externalMessageId,
      sentAt: new Date().toISOString(),
      simulateTemporaryError: dto.simulateTemporaryError,
    };

    const idempotencyKey = `sandbox:${channelAccount.externalAccountId}:${externalMessageId}`;

    let normalizedPreview: unknown = null;
    let normalizationError: string | null = null;
    try {
      normalizedPreview = await this.adapter.normalizeWebhook({ ...rawPayload, simulateTemporaryError: false });
    } catch (error) {
      normalizationError = (error as Error).message;
    }

    const result = await this.ingestion.ingest({
      provider: 'sandbox',
      organizationId: user.organizationId,
      idempotencyKey,
      payload: rawPayload,
      signatureValid: true,
    });

    return {
      ...result,
      normalizedPreview,
      normalizationError,
      rawPayload,
    };
  }

  async triggerAiNow(user: SessionUser, conversationPublicId: string) {
    const conversation = await this.prisma.client.conversation.findFirst({
      where: { publicId: conversationPublicId, organizationId: user.organizationId },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada.');

    const lastInboundMessage = await this.prisma.client.message.findFirst({
      where: { conversationId: conversation.id, direction: 'inbound' },
      orderBy: { createdAt: 'desc' },
    });

    // Se crea el registro de automatización ANTES de encolar el job (que puede
    // ejecutarse casi de inmediato con delay 0), para evitar una condición de
    // carrera en la que el worker no encuentre ningún AutomationRun 'scheduled'.
    await this.prisma.client.automationRun.create({
      data: {
        organizationId: user.organizationId,
        conversationId: conversation.id,
        status: 'scheduled',
        scheduledFor: new Date(),
        bullJobId: `inactivity-${conversation.id}`,
      },
    });

    await this.queue.scheduleInactivityTimeout(
      {
        conversationId: conversation.id,
        organizationId: user.organizationId,
        triggeredByMessageId: lastInboundMessage?.id ?? 'manual-trigger',
      },
      0,
    );

    return { success: true, message: 'Se forzó la evaluación de IA para esta conversación (sin esperar el temporizador).' };
  }

  async simulateDeliveryProgression(user: SessionUser, messagePublicId: string) {
    const message = await this.prisma.client.message.findFirst({
      where: { publicId: messagePublicId, organizationId: user.organizationId },
      include: { conversation: { include: { channelAccount: true } } },
    });
    if (!message) throw new NotFoundException('Mensaje no encontrado.');
    if (!message.externalMessageId) {
      throw new BadRequestException('Este mensaje aún no ha sido enviado por el canal (sin externalMessageId).');
    }

    const payloads = SandboxChannelAdapter.buildDeliveryProgressionPayloads(
      message.conversation.channelAccount.externalAccountId,
      message.externalMessageId,
    );

    for (const payload of payloads) {
      await this.queue.enqueueDeliveryProgression(
        {
          messageId: message.id,
          organizationId: user.organizationId,
          channelAccountExternalId: payload.channelAccountExternalId,
          externalMessageId: payload.externalMessageId,
          status: payload.status as 'delivered' | 'read',
        },
        new Date(payload.occurredAt).getTime() - Date.now(),
      );
    }

    return { success: true };
  }
}
