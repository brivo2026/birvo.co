import { createHmac, timingSafeEqual } from 'node:crypto';
import { MessageType } from '@birvo/contracts';
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

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/** Forma mínima y estable del payload de error de la Graph API de Meta. */
interface GraphApiErrorBody {
  error?: { message?: string; type?: string; code?: number };
}

async function parseGraphError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as GraphApiErrorBody;
    return body.error?.message ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

/**
 * Adaptador para la familia de APIs de Meta (WhatsApp Cloud API, Instagram
 * Messaging, Messenger Platform). Implementa el mapeo real de webhooks y las
 * llamadas de envío/lectura contra la Graph API de Meta, siguiendo la
 * documentación pública y estable de cada producto:
 *  - WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api
 *  - Messenger Platform (Instagram y Messenger comparten el mismo Send API):
 *    https://developers.facebook.com/docs/messenger-platform
 *
 * Queda DESACTIVADO (assertEnabled lanza) mientras no existan credenciales
 * configuradas (META_APP_SECRET + token de página/número), de modo que
 * nunca bloquea la ejecución del MVP en local sin ellas.
 *
 * No verificado contra la Graph API real (requiere una app de Meta aprobada
 * y credenciales reales) — implementado siguiendo el esquema documentado y
 * estable de cada producto. Verificar contra tráfico real antes de
 * considerarlo probado en producción.
 */
export class MetaChannelAdapter implements ChannelProviderAdapter {
  readonly provider: string;

  constructor(
    private readonly variant: 'whatsapp' | 'instagram' | 'messenger',
    private readonly credentials: {
      appSecret?: string;
      pageOrPhoneToken?: string;
    } = {},
  ) {
    this.provider = variant;
  }

  private assertEnabled(): void {
    if (!this.isEnabled()) {
      throw new Error(
        `MetaChannelAdapter(${this.variant}) está desactivado: faltan credenciales de Meta. ` +
          'Configura META_APP_SECRET y el token correspondiente en las variables de entorno para activarlo.',
      );
    }
  }

  isEnabled(): boolean {
    return Boolean(this.credentials.appSecret && this.credentials.pageOrPhoneToken);
  }

  async connect(credentials: ChannelCredentials): Promise<{ externalAccountId: string }> {
    this.assertEnabled();
    // En una integración real: llamar a Graph API para obtener el ID de la
    // cuenta (phone_number_id / page_id) a partir del token largo.
    return { externalAccountId: credentials.externalAccountId ?? 'unknown' };
  }

  async disconnect(): Promise<void> {
    this.assertEnabled();
  }

  async validateCredentials(credentials: ChannelCredentials): Promise<boolean> {
    if (!credentials.appSecret || !credentials.pageOrPhoneToken) return false;
    const response = await fetch(`${GRAPH_API_BASE}/debug_token?input_token=${encodeURIComponent(credentials.pageOrPhoneToken)}`, {
      headers: { Authorization: `Bearer ${credentials.pageOrPhoneToken}` },
    });
    return response.ok;
  }

  async verifyWebhookSignature(input: VerifyWebhookSignatureInput): Promise<boolean> {
    if (!input.signatureHeader || !input.secret) return false;
    const expected =
      'sha256=' +
      createHmac('sha256', input.secret)
        .update(typeof input.rawBody === 'string' ? input.rawBody : input.rawBody.toString('utf8'))
        .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(input.signatureHeader);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  async normalizeWebhook(rawPayload: unknown): Promise<WebhookNormalizationResult> {
    if (this.variant === 'whatsapp') {
      return normalizeWhatsAppWebhook(rawPayload);
    }
    return normalizeMessengerStyleWebhook(rawPayload, this.variant);
  }

  async sendTextMessage(input: SendTextMessageInput): Promise<SendMessageResult> {
    this.assertEnabled();
    if (this.variant === 'whatsapp') {
      return this.postWhatsApp(input.channelAccountExternalId, {
        messaging_product: 'whatsapp',
        to: input.recipientExternalId,
        type: 'text',
        text: { body: input.text },
      });
    }
    return this.postMessengerStyle(input.recipientExternalId, { text: input.text });
  }

  async sendMediaMessage(input: SendMediaMessageInput): Promise<SendMessageResult> {
    this.assertEnabled();
    const mediaField = whatsAppMediaFieldFromMime(input.mediaMimeType);
    if (this.variant === 'whatsapp') {
      return this.postWhatsApp(input.channelAccountExternalId, {
        messaging_product: 'whatsapp',
        to: input.recipientExternalId,
        type: mediaField,
        [mediaField]: { link: input.mediaUrl, caption: input.caption },
      });
    }
    return this.postMessengerStyle(input.recipientExternalId, {
      attachment: {
        type: messengerAttachmentTypeFromMime(input.mediaMimeType),
        payload: { url: input.mediaUrl, is_reusable: true },
      },
    });
  }

  async markAsRead(input: MarkAsReadInput): Promise<void> {
    this.assertEnabled();
    if (this.variant === 'whatsapp') {
      await this.callGraphApi(`${input.channelAccountExternalId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: input.externalMessageId,
      });
      return;
    }
    // Messenger/Instagram: sender_action "mark_seen" hacia el usuario, no por mensaje individual.
    await this.callGraphApi('me/messages', {
      recipient: { id: input.channelAccountExternalId },
      sender_action: 'mark_seen',
    });
  }

  async downloadAttachment(input: DownloadAttachmentInput): Promise<DownloadAttachmentResult> {
    this.assertEnabled();
    if (this.variant === 'whatsapp') {
      // WhatsApp entrega un media id en el webhook, no una URL directa: hay
      // que resolverlo primero a una URL temporal autenticada.
      const metaResponse = await fetch(`${GRAPH_API_BASE}/${input.mediaUrl}`, {
        headers: { Authorization: `Bearer ${this.credentials.pageOrPhoneToken}` },
      });
      if (!metaResponse.ok) {
        throw new Error(`No se pudo resolver la URL del adjunto de WhatsApp: ${await parseGraphError(metaResponse)}`);
      }
      const meta = (await metaResponse.json()) as { url: string; mime_type: string; file_size: number };
      const fileResponse = await fetch(meta.url, {
        headers: { Authorization: `Bearer ${this.credentials.pageOrPhoneToken}` },
      });
      if (!fileResponse.ok) {
        throw new Error(`No se pudo descargar el adjunto de WhatsApp (HTTP ${fileResponse.status})`);
      }
      const buffer = Buffer.from(await fileResponse.arrayBuffer());
      return { buffer, mimeType: meta.mime_type, filename: `whatsapp-media-${Date.now()}` };
    }

    // Instagram/Messenger entregan una URL directa y públicamente descargable en el webhook.
    const fileResponse = await fetch(input.mediaUrl);
    if (!fileResponse.ok) {
      throw new Error(`No se pudo descargar el adjunto (HTTP ${fileResponse.status})`);
    }
    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    const mimeType = fileResponse.headers.get('content-type') ?? 'application/octet-stream';
    return { buffer, mimeType, filename: `${this.variant}-media-${Date.now()}` };
  }

  async refreshCredentials(credentials: ChannelCredentials): Promise<ChannelCredentials> {
    this.assertEnabled();
    return credentials;
  }

  private async postWhatsApp(phoneNumberId: string, body: Record<string, unknown>): Promise<SendMessageResult> {
    try {
      const data = await this.callGraphApi(`${phoneNumberId}/messages`, body);
      const externalMessageId = (data as { messages?: Array<{ id: string }> }).messages?.[0]?.id;
      if (!externalMessageId) {
        return { externalMessageId: '', status: 'failed', errorReason: 'La Graph API no devolvió un id de mensaje.' };
      }
      return { externalMessageId, status: 'sent' };
    } catch (error) {
      return { externalMessageId: '', status: 'failed', errorReason: (error as Error).message };
    }
  }

  private async postMessengerStyle(recipientId: string, message: Record<string, unknown>): Promise<SendMessageResult> {
    try {
      const data = await this.callGraphApi('me/messages', {
        recipient: { id: recipientId },
        message,
        messaging_type: 'RESPONSE',
      });
      const externalMessageId = (data as { message_id?: string }).message_id;
      if (!externalMessageId) {
        return { externalMessageId: '', status: 'failed', errorReason: 'La Graph API no devolvió un id de mensaje.' };
      }
      return { externalMessageId, status: 'sent' };
    } catch (error) {
      return { externalMessageId: '', status: 'failed', errorReason: (error as Error).message };
    }
  }

  private async callGraphApi(path: string, body: Record<string, unknown>): Promise<unknown> {
    const url = path.startsWith('me/messages')
      ? `${GRAPH_API_BASE}/${path}?access_token=${encodeURIComponent(this.credentials.pageOrPhoneToken ?? '')}`
      : `${GRAPH_API_BASE}/${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(path.startsWith('me/messages') ? {} : { Authorization: `Bearer ${this.credentials.pageOrPhoneToken}` }),
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(await parseGraphError(response));
    }
    return response.json();
  }
}

function whatsAppMediaFieldFromMime(mime: string): 'image' | 'audio' | 'video' | 'document' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return 'document';
}

function messengerAttachmentTypeFromMime(mime: string): 'image' | 'audio' | 'video' | 'file' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return 'file';
}

export function messageTypeFromMime(mime: string): MessageType {
  if (mime.startsWith('image/')) return MessageType.IMAGE;
  if (mime.startsWith('audio/')) return MessageType.AUDIO;
  if (mime.startsWith('video/')) return MessageType.VIDEO;
  return MessageType.FILE;
}

// --- Normalización de webhooks --------------------------------------------

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          image?: { id: string; mime_type: string; caption?: string };
          audio?: { id: string; mime_type: string };
          video?: { id: string; mime_type: string; caption?: string };
          document?: { id: string; mime_type: string; filename?: string; caption?: string };
        }>;
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          errors?: Array<{ title?: string }>;
        }>;
      };
    }>;
  }>;
}

function normalizeWhatsAppWebhook(rawPayload: unknown): WebhookNormalizationResult {
  const payload = rawPayload as WhatsAppWebhookPayload;
  const messages: WebhookNormalizationResult['messages'] = [];
  const statusUpdates: WebhookNormalizationResult['statusUpdates'] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;
      const phoneNumberId = value.metadata?.phone_number_id ?? '';

      for (const message of value.messages ?? []) {
        const contactName = value.contacts?.find((c) => c.wa_id === message.from)?.profile?.name;
        const base = {
          provider: 'whatsapp' as const,
          channelAccountExternalId: phoneNumberId,
          externalMessageId: message.id,
          externalUserId: message.from,
          contactDisplayName: contactName,
          sentAt: new Date(Number(message.timestamp) * 1000),
          raw: message as unknown as Record<string, unknown>,
        };

        if (message.type === 'text' && message.text) {
          messages.push({ ...base, messageType: MessageType.TEXT, text: message.text.body });
        } else if (message.type === 'image' && message.image) {
          messages.push({
            ...base,
            messageType: MessageType.IMAGE,
            mediaUrl: message.image.id,
            mediaMimeType: message.image.mime_type,
            text: message.image.caption,
          });
        } else if (message.type === 'audio' && message.audio) {
          messages.push({ ...base, messageType: MessageType.AUDIO, mediaUrl: message.audio.id, mediaMimeType: message.audio.mime_type });
        } else if (message.type === 'video' && message.video) {
          messages.push({
            ...base,
            messageType: MessageType.VIDEO,
            mediaUrl: message.video.id,
            mediaMimeType: message.video.mime_type,
            text: message.video.caption,
          });
        } else if (message.type === 'document' && message.document) {
          messages.push({
            ...base,
            messageType: MessageType.FILE,
            mediaUrl: message.document.id,
            mediaMimeType: message.document.mime_type,
            text: message.document.caption,
          });
        }
        // Otros tipos (location, contacts, sticker, interactive, reaction, etc.)
        // quedan fuera de alcance del MVP: no se descartan con error, solo se ignoran.
      }

      for (const status of value.statuses ?? []) {
        statusUpdates.push({
          provider: 'whatsapp',
          channelAccountExternalId: phoneNumberId,
          externalMessageId: status.id,
          status: status.status,
          occurredAt: new Date(Number(status.timestamp) * 1000),
          errorReason: status.errors?.[0]?.title,
        });
      }
    }
  }

  return { messages, statusUpdates };
}

interface MessengerStyleWebhookPayload {
  entry?: Array<{
    id?: string;
    messaging?: Array<{
      sender?: { id: string };
      recipient?: { id: string };
      timestamp?: number;
      message?: {
        mid: string;
        text?: string;
        is_echo?: boolean;
        attachments?: Array<{ type: string; payload?: { url?: string } }>;
      };
      delivery?: { mids?: string[]; watermark?: number };
      read?: { watermark?: number };
    }>;
  }>;
}

function normalizeMessengerStyleWebhook(rawPayload: unknown, variant: 'instagram' | 'messenger'): WebhookNormalizationResult {
  const payload = rawPayload as MessengerStyleWebhookPayload;
  const messages: WebhookNormalizationResult['messages'] = [];
  const statusUpdates: WebhookNormalizationResult['statusUpdates'] = [];

  for (const entry of payload.entry ?? []) {
    const pageId = entry.id ?? '';
    for (const event of entry.messaging ?? []) {
      // Los eco de mensajes salientes (is_echo) no son mensajes entrantes nuevos.
      if (event.message && !event.message.is_echo && event.sender) {
        const attachment = event.message.attachments?.[0];
        const base = {
          provider: variant,
          channelAccountExternalId: pageId,
          externalMessageId: event.message.mid,
          externalUserId: event.sender.id,
          sentAt: new Date(event.timestamp ?? Date.now()),
          raw: event as unknown as Record<string, unknown>,
        };

        if (attachment?.payload?.url) {
          messages.push({
            ...base,
            messageType: messengerMessageTypeFromAttachmentType(attachment.type),
            mediaUrl: attachment.payload.url,
          });
        } else {
          messages.push({ ...base, messageType: MessageType.TEXT, text: event.message.text });
        }
      }

      if (event.delivery && event.sender) {
        for (const mid of event.delivery.mids ?? []) {
          statusUpdates.push({
            provider: variant,
            channelAccountExternalId: pageId,
            externalMessageId: mid,
            status: 'delivered',
            occurredAt: new Date(event.delivery.watermark ?? Date.now()),
          });
        }
      }
    }
  }

  return { messages, statusUpdates };
}

function messengerMessageTypeFromAttachmentType(type: string): MessageType {
  if (type === 'image') return MessageType.IMAGE;
  if (type === 'audio') return MessageType.AUDIO;
  if (type === 'video') return MessageType.VIDEO;
  return MessageType.FILE;
}
