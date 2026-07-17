import { z } from 'zod';
import { MessageType } from './enums';

export const sendMessageSchema = z.object({
  messageType: z.nativeEnum(MessageType).default(MessageType.TEXT),
  content: z.string().trim().min(1).max(4096),
  replyToMessageId: z.string().uuid().optional(),
});
export type SendMessageDto = z.infer<typeof sendMessageSchema>;

export const listMessagesQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
