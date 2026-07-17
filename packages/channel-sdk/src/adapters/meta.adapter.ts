import { createHmac, timingSafeEqual } from 'node:crypto';
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
 * Adaptador para la familia de APIs de Meta (WhatsApp Cloud API, Instagram
 * Messaging, Messenger). La estructura, contratos y verificación de firma
 * están completos y documentados, pero las llamadas de red reales quedan
 * DESACTIVADAS mientras no existan credenciales configuradas
 * (META_APP_ID/META_APP_SECRET/tokens de página), de modo que nunca bloquea
 * la ejecución del MVP en local.
 *
 * Documentación de referencia (consultar antes de activar en producción):
 *  - WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api
 *  - Instagram Messaging: https://developers.facebook.com/docs/messenger-platform/instagram
 *  - Messenger Platform: https://developers.facebook.com/docs/messenger-platform
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
    // Integración real: GET /debug_token contra Graph API.
    return true;
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
    // Estructura de referencia para el payload real de Meta (Graph API
    // "messaging" webhooks). Se documenta el mapeo esperado; la
    // implementación completa se activa junto con las credenciales.
    //
    // entry[].messaging[] -> { sender: { id }, message: { mid, text } , timestamp }
    void rawPayload;
    throw new Error(
      `MetaChannelAdapter(${this.variant}).normalizeWebhook no está implementado en el MVP. ` +
        'El contrato (NormalizedInboundMessage) ya está definido en @birvo/contracts; ' +
        'implementar el mapeo específico de Graph API al activar credenciales reales.',
    );
  }

  async sendTextMessage(_input: SendTextMessageInput): Promise<SendMessageResult> {
    this.assertEnabled();
    throw new Error('Envío real vía Meta Graph API pendiente de credenciales/activación.');
  }

  async sendMediaMessage(_input: SendMediaMessageInput): Promise<SendMessageResult> {
    this.assertEnabled();
    throw new Error('Envío real vía Meta Graph API pendiente de credenciales/activación.');
  }

  async markAsRead(_input: MarkAsReadInput): Promise<void> {
    this.assertEnabled();
    throw new Error('Marcado de lectura real vía Meta Graph API pendiente de credenciales/activación.');
  }

  async downloadAttachment(_input: DownloadAttachmentInput): Promise<DownloadAttachmentResult> {
    this.assertEnabled();
    throw new Error('Descarga de adjuntos real vía Meta Graph API pendiente de credenciales/activación.');
  }

  async refreshCredentials(credentials: ChannelCredentials): Promise<ChannelCredentials> {
    this.assertEnabled();
    return credentials;
  }
}

export function messageTypeFromMime(mime: string): MessageType {
  if (mime.startsWith('image/')) return MessageType.IMAGE;
  if (mime.startsWith('audio/')) return MessageType.AUDIO;
  if (mime.startsWith('video/')) return MessageType.VIDEO;
  return MessageType.FILE;
}
