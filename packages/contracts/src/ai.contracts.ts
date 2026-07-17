import { z } from 'zod';

export const aiConfigurationSchema = z.object({
  aiEnabled: z.boolean().default(false),
  inactivityMinutes: z.number().int().min(1).max(1440).default(5),
  mode: z.enum(['suggestion', 'automatic']).default('suggestion'),
  businessHoursStart: z.string().regex(/^\d{2}:\d{2}$/).default('08:00'),
  businessHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).default('18:00'),
  businessDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  maximumAutomaticReplies: z.number().int().min(0).max(50).default(3),
  confidenceThreshold: z.number().min(0).max(1).default(0.7),
  escalationKeywords: z.array(z.string()).default([]),
  excludedTopics: z.array(z.string()).default([]),
});
export type AiConfigurationDto = z.infer<typeof aiConfigurationSchema>;

export const updateAiConfigurationSchema = aiConfigurationSchema.partial();
export type UpdateAiConfigurationDto = z.infer<typeof updateAiConfigurationSchema>;

export const generateReplyRequestSchema = z.object({
  conversationId: z.string().uuid(),
});
export type GenerateReplyRequest = z.infer<typeof generateReplyRequestSchema>;

export const safetyFlagSchema = z.enum([
  'threat',
  'emergency',
  'medical_information',
  'legal_information',
  'financial_sensitive',
  'sensitive_complaint',
  'data_deletion_request',
  'crisis_language',
]);
export type SafetyFlag = z.infer<typeof safetyFlagSchema>;

export const safetyAssessmentSchema = z.object({
  isSafeToAutomate: z.boolean(),
  flags: z.array(safetyFlagSchema),
  reason: z.string().optional(),
});
export type SafetyAssessment = z.infer<typeof safetyAssessmentSchema>;

export const aiReplyResultSchema = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1),
  intent: z.string().optional(),
  safety: safetyAssessmentSchema,
  provider: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  latencyMs: z.number(),
  tokensUsed: z.number().optional(),
});
export type AiReplyResult = z.infer<typeof aiReplyResultSchema>;
