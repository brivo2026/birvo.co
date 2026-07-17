import { randomUUID } from 'node:crypto';
import { ChannelProvider, MessageType } from '@birvo/contracts';
import type {
  ChannelCredentials,
  ChannelProviderAdapter,
  DownloadAttachmentInput,
  DownloadAttachmentResult,
  MarkAsReadInput,
  SendMediaMessageInput,
  SendMessageResult,
  SendTextMessageInput,
  VerifyWebhookSignatureInput,
  WebhookNormalizationResult,
} from '../types';

/**
 * Payload "crudo" que produce el canal sandbox. No tiene relación con
 * ningún proveedor real: existe únicamente para ejercitar el mismo flujo de
 * webhook -> normalización -> dominio que usarían WhatsApp/Instagram/Messenger.
 */
export interface SandboxInboundPayload {
  type: 'inbound_message';
  channelAccountExternalId: string;
  externalUserId: string;
  contactDisplayName?: string;
  messageType: string;
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaDurationSeconds?: number;
  externalMessageId: string;
  sentAt: string;
  simulateTemporaryError?: boolean;
}

export interface SandboxStatusPayload {
  type: 'status_update';
  channelAccountExternalId: string;
  externalMessageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  occurredAt: string;
}

export type SandboxWebhookPayload = SandboxInboundPayload | SandboxStatusPayload;

export class SandboxTemporaryError extends Error {
  constructor() {
    super('Error temporal simulado por el canal sandbox');
    this.name = 'SandboxTemporaryError';
  }
}

/**
 * Adaptador totalmente funcional que simula un canal de mensajería sin
 * requerir credenciales externas. Se usa tanto en desarrollo como en la
 * pantalla /dev/sandbox.
 */
export class SandboxChannelAdapter implements ChannelProviderAdapter {
  readonly provider = ChannelProvider.SANDBOX;

  async connect(_credentials: ChannelCredentials): Promise<{ externalAccountId: string }> {
    return { externalAccountId: 'sandbox-main' };
  }

  async disconnect(): Promise<void> {
    // No-op: el canal sandbox no mantiene conexión externa.
  }

  async validateCredentials(): Promise<boolean> {
    return true;
  }

  async verifyWebhookSignature(_input: VerifyWebhookSignatureInput): Promise<boolean> {
    // El canal sandbox no firma sus payloads (no hay proveedor externo real);
    // siempre se considera válido, a diferencia de MetaChannelAdapter.
    return true;
  }

  async normalizeWebhook(rawPayload: unknown): Promise<WebhookNormalizationResult> {
    const payload = rawPayload as SandboxWebhookPayload;

    if (payload.type === 'inbound_message') {
      if (payload.simulateTemporaryError) {
        throw new SandboxTemporaryError();
      }
      return {
        messages: [
          {
            provider: ChannelProvider.SANDBOX,
            channelAccountExternalId: payload.channelAccountExternalId,
            externalMessageId: payload.externalMessageId,
            externalUserId: payload.externalUserId,
            contactDisplayName: payload.contactDisplayName,
            messageType: (payload.messageType as MessageType) ?? MessageType.TEXT,
            text: payload.text,
            mediaUrl: payload.mediaUrl,
            mediaMimeType: payload.mediaMimeType,
            mediaDurationSeconds: payload.mediaDurationSeconds,
            sentAt: new Date(payload.sentAt),
            raw: payload as unknown as Record<string, unknown>,
          },
        ],
        statusUpdates: [],
      };
    }

    return {
      messages: [],
      statusUpdates: [
        {
          provider: ChannelProvider.SANDBOX,
          channelAccountExternalId: payload.channelAccountExternalId,
          externalMessageId: payload.externalMessageId,
          status: payload.status,
          occurredAt: new Date(payload.occurredAt),
        },
      ],
    };
  }

  async sendTextMessage(input: SendTextMessageInput): Promise<SendMessageResult> {
    return {
      externalMessageId: `sandbox-out-${randomUUID()}`,
      status: 'sent',
    };
  }

  async sendMediaMessage(input: SendMediaMessageInput): Promise<SendMessageResult> {
    return {
      externalMessageId: `sandbox-out-${randomUUID()}`,
      status: 'sent',
    };
  }

  async markAsRead(_input: MarkAsReadInput): Promise<void> {
    // No-op en sandbox.
  }

  async downloadAttachment(_input: DownloadAttachmentInput): Promise<DownloadAttachmentResult> {
    return {
      buffer: Buffer.from('sandbox-media-placeholder'),
      mimeType: 'application/octet-stream',
      filename: 'sandbox-media.bin',
    };
  }

  async refreshCredentials(credentials: ChannelCredentials): Promise<ChannelCredentials> {
    return credentials;
  }

  /**
   * Progresión de estados sent -> delivered -> read usada exclusivamente
   * por /dev/sandbox y por apps/worker para demostrar el ciclo de vida
   * completo de un mensaje saliente sin depender de un proveedor real.
   */
  static buildDeliveryProgressionPayloads(
    channelAccountExternalId: string,
    externalMessageId: string,
  ): [SandboxStatusPayload, SandboxStatusPayload] {
    const now = Date.now();
    return [
      {
        type: 'status_update',
        channelAccountExternalId,
        externalMessageId,
        status: 'delivered',
        occurredAt: new Date(now + 1500).toISOString(),
      },
      {
        type: 'status_update',
        channelAccountExternalId,
        externalMessageId,
        status: 'read',
        occurredAt: new Date(now + 4000).toISOString(),
      },
    ];
  }
}
