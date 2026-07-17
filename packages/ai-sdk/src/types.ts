import type { AiReplyResult, SafetyAssessment } from '@birvo/contracts';

export interface ConversationMessageForAi {
  senderType: 'contact' | 'user' | 'ai' | 'system';
  content: string;
  createdAt: Date;
}

export interface GenerateReplyInput {
  conversationId: string;
  history: ConversationMessageForAi[];
  contactName: string;
  escalationKeywords: string[];
  excludedTopics: string[];
}

export interface SummarizeConversationInput {
  history: ConversationMessageForAi[];
}

export interface ClassifyIntentInput {
  text: string;
}

export interface ClassifyIntentResult {
  intent: string;
  confidence: number;
}

export interface TranscribeAudioInput {
  audioBuffer: Buffer;
  mimeType: string;
  languageHint?: string;
}

export interface TranscribeAudioResult {
  text: string;
  language: string;
  durationSeconds: number;
  provider: string;
}

export interface HealthCheckResult {
  healthy: boolean;
  provider: string;
  message?: string;
}

/**
 * Contrato desacoplado de proveedor de IA. Nunca se depende directamente de
 * un SDK (OpenAI, Anthropic, etc.) fuera de la implementación concreta.
 */
export interface AiProvider {
  readonly name: string;
  readonly model: string;

  generateReply(input: GenerateReplyInput): Promise<AiReplyResult>;
  summarizeConversation(input: SummarizeConversationInput): Promise<string>;
  classifyIntent(input: ClassifyIntentInput): Promise<ClassifyIntentResult>;
  transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioResult>;
  healthCheck(): Promise<HealthCheckResult>;
}

export type { AiReplyResult, SafetyAssessment };
