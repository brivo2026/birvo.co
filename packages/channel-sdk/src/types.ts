import type { NormalizedInboundMessage, NormalizedStatusUpdate } from '@birvo/contracts';

export interface ChannelCredentials {
  [key: string]: string | undefined;
}

export interface SendTextMessageInput {
  channelAccountExternalId: string;
  recipientExternalId: string;
  text: string;
  /** Id del mensaje interno de BIRVO, usado como referencia de idempotencia con el proveedor. */
  internalMessageId: string;
}

export interface SendMediaMessageInput {
  channelAccountExternalId: string;
  recipientExternalId: string;
  mediaUrl: string;
  mediaMimeType: string;
  caption?: string;
  internalMessageId: string;
}

export interface SendMessageResult {
  externalMessageId: string;
  status: 'sent' | 'failed';
  errorReason?: string;
}

export interface MarkAsReadInput {
  channelAccountExternalId: string;
  externalMessageId: string;
}

export interface DownloadAttachmentInput {
  channelAccountExternalId: string;
  mediaUrl: string;
}

export interface DownloadAttachmentResult {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

export interface VerifyWebhookSignatureInput {
  rawBody: string | Buffer;
  signatureHeader: string | undefined;
  secret: string;
}

export interface WebhookNormalizationResult {
  messages: NormalizedInboundMessage[];
  statusUpdates: NormalizedStatusUpdate[];
}

/**
 * Contrato que debe implementar cualquier proveedor de canal (WhatsApp,
 * Instagram, Messenger, sandbox, futuros canales). El dominio de BIRVO
 * SOLO interactúa con esta interfaz — nunca con el SDK o payloads propios
 * de cada proveedor.
 */
export interface ChannelProviderAdapter {
  readonly provider: string;

  connect(credentials: ChannelCredentials): Promise<{ externalAccountId: string }>;
  disconnect(channelAccountExternalId: string): Promise<void>;
  validateCredentials(credentials: ChannelCredentials): Promise<boolean>;

  normalizeWebhook(rawPayload: unknown): Promise<WebhookNormalizationResult>;

  sendTextMessage(input: SendTextMessageInput): Promise<SendMessageResult>;
  sendMediaMessage(input: SendMediaMessageInput): Promise<SendMessageResult>;
  markAsRead(input: MarkAsReadInput): Promise<void>;
  downloadAttachment(input: DownloadAttachmentInput): Promise<DownloadAttachmentResult>;

  refreshCredentials(credentials: ChannelCredentials): Promise<ChannelCredentials>;
  verifyWebhookSignature(input: VerifyWebhookSignatureInput): Promise<boolean>;
}
