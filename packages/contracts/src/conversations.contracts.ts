import { z } from 'zod';
import { ConversationPriority, ConversationStatus } from './enums';

export const listConversationsQuerySchema = z.object({
  status: z.nativeEnum(ConversationStatus).optional(),
  assignedUserId: z.union([z.string().uuid(), z.literal('me'), z.literal('unassigned')]).optional(),
  channelAccountId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  unreadOnly: z.coerce.boolean().optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;

export const assignConversationSchema = z.object({
  userId: z.string().uuid().nullable(),
});
export type AssignConversationDto = z.infer<typeof assignConversationSchema>;

export const updateConversationStatusSchema = z.object({
  status: z.nativeEnum(ConversationStatus),
});
export type UpdateConversationStatusDto = z.infer<typeof updateConversationStatusSchema>;

export const updateConversationPrioritySchema = z.object({
  priority: z.nativeEnum(ConversationPriority),
});
export type UpdateConversationPriorityDto = z.infer<typeof updateConversationPrioritySchema>;

export const addConversationTagSchema = z.object({
  tagId: z.string().uuid(),
});
export type AddConversationTagDto = z.infer<typeof addConversationTagSchema>;

export const createInternalNoteSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});
export type CreateInternalNoteDto = z.infer<typeof createInternalNoteSchema>;

export const updateAiModeSchema = z.object({
  aiMode: z.enum(['off', 'suggestion', 'automatic']),
});
export type UpdateAiModeDto = z.infer<typeof updateAiModeSchema>;
