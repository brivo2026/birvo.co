import { z } from 'zod';

/**
 * Nombres de colas y jobs compartidos entre apps/api (productor) y
 * apps/worker (consumidor). Mantener sincronizado es crítico: un typo aquí
 * hace que un job nunca se procese.
 */
export const QueueName = {
  WEBHOOKS: 'birvo-webhooks',
  OUTBOUND_MESSAGES: 'birvo-outbound-messages',
  AUTOMATION_TIMERS: 'birvo-automation-timers',
  TRANSCRIPTIONS: 'birvo-transcriptions',
  DEAD_LETTER: 'birvo-dead-letter',
} as const;
export type QueueName = (typeof QueueName)[keyof typeof QueueName];

export const JobName = {
  PROCESS_WEBHOOK_EVENT: 'process-webhook-event',
  SEND_OUTBOUND_MESSAGE: 'send-outbound-message',
  SIMULATE_DELIVERY_PROGRESSION: 'simulate-delivery-progression',
  EVALUATE_INACTIVITY_TIMEOUT: 'evaluate-inactivity-timeout',
  TRANSCRIBE_ATTACHMENT: 'transcribe-attachment',
} as const;
export type JobName = (typeof JobName)[keyof typeof JobName];

export const processWebhookJobSchema = z.object({
  webhookEventId: z.string(),
});
export type ProcessWebhookJob = z.infer<typeof processWebhookJobSchema>;

export const sendOutboundMessageJobSchema = z.object({
  messageId: z.string(),
  organizationId: z.string(),
});
export type SendOutboundMessageJob = z.infer<typeof sendOutboundMessageJobSchema>;

export const simulateDeliveryProgressionJobSchema = z.object({
  messageId: z.string(),
  organizationId: z.string(),
  channelAccountExternalId: z.string(),
  externalMessageId: z.string(),
  status: z.enum(['delivered', 'read']),
});
export type SimulateDeliveryProgressionJob = z.infer<typeof simulateDeliveryProgressionJobSchema>;

export const evaluateInactivityTimeoutJobSchema = z.object({
  conversationId: z.string(),
  organizationId: z.string(),
  /** Marca de tiempo del último mensaje del contacto que originó este timer, para poder ignorarlo si ya hay uno más nuevo. */
  triggeredByMessageId: z.string(),
});
export type EvaluateInactivityTimeoutJob = z.infer<typeof evaluateInactivityTimeoutJobSchema>;

export const transcribeAttachmentJobSchema = z.object({
  attachmentId: z.string(),
  organizationId: z.string(),
});
export type TranscribeAttachmentJob = z.infer<typeof transcribeAttachmentJobSchema>;
