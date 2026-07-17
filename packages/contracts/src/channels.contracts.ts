import { z } from 'zod';
import { ChannelProvider, MessageType } from './enums';

/**
 * Modelo normalizado al que TODO adaptador de canal debe transformar un
 * webhook entrante antes de que el dominio de BIRVO lo procese. Ningún
 * caso de uso conoce la forma del payload original del proveedor.
 */
export const normalizedInboundMessageSchema = z.object({
  provider: z.nativeEnum(ChannelProvider),
  channelAccountExternalId: z.string(),
  externalMessageId: z.string(),
  externalUserId: z.string(),
  externalUsername: z.string().optional(),
  contactDisplayName: z.string().optional(),
  contactAvatarUrl: z.string().optional(),
  messageType: z.nativeEnum(MessageType),
  text: z.string().optional(),
  mediaUrl: z.string().optional(),
  mediaMimeType: z.string().optional(),
  mediaDurationSeconds: z.number().optional(),
  sentAt: z.coerce.date(),
  raw: z.record(z.string(), z.unknown()),
});
export type NormalizedInboundMessage = z.infer<typeof normalizedInboundMessageSchema>;

export const normalizedStatusUpdateSchema = z.object({
  provider: z.nativeEnum(ChannelProvider),
  channelAccountExternalId: z.string(),
  externalMessageId: z.string(),
  status: z.enum(['sent', 'delivered', 'read', 'failed']),
  occurredAt: z.coerce.date(),
  errorReason: z.string().optional(),
});
export type NormalizedStatusUpdate = z.infer<typeof normalizedStatusUpdateSchema>;

// --- Canal Sandbox ------------------------------------------------------

export const simulateInboundMessageSchema = z.object({
  contactId: z.string().uuid().optional(),
  contactName: z.string().trim().min(1).max(160).optional(),
  channelAccountId: z.string().uuid(),
  messageType: z.nativeEnum(MessageType).default(MessageType.TEXT),
  text: z.string().trim().max(4096).optional(),
  simulateDuplicate: z.boolean().default(false),
  simulateTemporaryError: z.boolean().default(false),
});
export type SimulateInboundMessageDto = z.infer<typeof simulateInboundMessageSchema>;

export const createChannelAccountSchema = z.object({
  provider: z.nativeEnum(ChannelProvider),
  displayName: z.string().trim().min(1).max(120),
  credentials: z.record(z.string(), z.string()).optional(),
});
export type CreateChannelAccountDto = z.infer<typeof createChannelAccountSchema>;
