import type { ChannelProviderAdapter } from '../types';

/**
 * Contrato de referencia para incorporar un canal futuro (p. ej. Telegram,
 * correo electrónico, chat web propio). Copiar esta clase, implementar cada
 * método siguiendo `ChannelProviderAdapter` y registrarla en
 * `ChannelRegistry` — ningún otro módulo del dominio requiere cambios.
 */
export abstract class FutureChannelAdapter implements ChannelProviderAdapter {
  abstract readonly provider: string;

  abstract connect(...args: Parameters<ChannelProviderAdapter['connect']>): ReturnType<ChannelProviderAdapter['connect']>;
  abstract disconnect(...args: Parameters<ChannelProviderAdapter['disconnect']>): ReturnType<ChannelProviderAdapter['disconnect']>;
  abstract validateCredentials(
    ...args: Parameters<ChannelProviderAdapter['validateCredentials']>
  ): ReturnType<ChannelProviderAdapter['validateCredentials']>;
  abstract normalizeWebhook(
    ...args: Parameters<ChannelProviderAdapter['normalizeWebhook']>
  ): ReturnType<ChannelProviderAdapter['normalizeWebhook']>;
  abstract sendTextMessage(
    ...args: Parameters<ChannelProviderAdapter['sendTextMessage']>
  ): ReturnType<ChannelProviderAdapter['sendTextMessage']>;
  abstract sendMediaMessage(
    ...args: Parameters<ChannelProviderAdapter['sendMediaMessage']>
  ): ReturnType<ChannelProviderAdapter['sendMediaMessage']>;
  abstract markAsRead(...args: Parameters<ChannelProviderAdapter['markAsRead']>): ReturnType<ChannelProviderAdapter['markAsRead']>;
  abstract downloadAttachment(
    ...args: Parameters<ChannelProviderAdapter['downloadAttachment']>
  ): ReturnType<ChannelProviderAdapter['downloadAttachment']>;
  abstract refreshCredentials(
    ...args: Parameters<ChannelProviderAdapter['refreshCredentials']>
  ): ReturnType<ChannelProviderAdapter['refreshCredentials']>;
  abstract verifyWebhookSignature(
    ...args: Parameters<ChannelProviderAdapter['verifyWebhookSignature']>
  ): ReturnType<ChannelProviderAdapter['verifyWebhookSignature']>;
}
