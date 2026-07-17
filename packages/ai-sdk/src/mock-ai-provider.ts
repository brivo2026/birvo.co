import type {
  AiProvider,
  ClassifyIntentInput,
  ClassifyIntentResult,
  GenerateReplyInput,
  HealthCheckResult,
  SummarizeConversationInput,
  TranscribeAudioInput,
  TranscribeAudioResult,
} from './types';
import type { AiReplyResult } from '@birvo/contracts';
import { classifySafety, matchesEscalationKeyword } from './safety-classifier';

const PROMPT_VERSION = 'birvo-mock-v1';

const INTENT_KEYWORDS: Record<string, string[]> = {
  pricing: ['precio', 'costo', 'plan', 'cuánto cuesta'],
  support: ['ayuda', 'problema', 'no funciona', 'error', 'falla'],
  greeting: ['hola', 'buenos días', 'buenas tardes', 'buenas noches'],
  sales: ['comprar', 'contratar', 'demo', 'información sobre'],
};

/**
 * Proveedor de IA completamente funcional sin dependencias externas.
 * Genera respuestas deterministas basadas en reglas simples, suficientes
 * para demostrar el flujo completo (sugerencia / respuesta automática /
 * transferencia a humano) sin necesitar una API key real.
 */
export class MockAiProvider implements AiProvider {
  readonly name = 'mock';
  readonly model = 'birvo-mock-rules-v1';

  async generateReply(input: GenerateReplyInput): Promise<AiReplyResult> {
    const start = Date.now();
    const lastContactMessage = [...input.history].reverse().find((m) => m.senderType === 'contact');
    const text = lastContactMessage?.content ?? '';

    const safety = classifySafety(text, input.excludedTopics);
    const escalation = matchesEscalationKeyword(text, input.escalationKeywords);

    if (!safety.isSafeToAutomate || escalation) {
      return {
        text: '',
        confidence: 0,
        safety: escalation
          ? { isSafeToAutomate: false, flags: [], reason: `Palabra de escalamiento detectada: "${escalation}"` }
          : safety,
        provider: this.name,
        model: this.model,
        promptVersion: PROMPT_VERSION,
        latencyMs: Date.now() - start,
      };
    }

    const intent = this.detectIntent(text);
    const reply = this.buildReplyForIntent(intent, input.contactName);

    return {
      text: reply,
      confidence: intent === 'unknown' ? 0.55 : 0.86,
      intent,
      safety,
      provider: this.name,
      model: this.model,
      promptVersion: PROMPT_VERSION,
      latencyMs: Date.now() - start,
      tokensUsed: Math.round(reply.length / 4),
    };
  }

  async summarizeConversation(input: SummarizeConversationInput): Promise<string> {
    const contactMessages = input.history.filter((m) => m.senderType === 'contact');
    if (contactMessages.length === 0) return 'Sin mensajes del contacto todavía.';
    const topics = contactMessages
      .slice(-3)
      .map((m) => m.content.slice(0, 80))
      .join(' · ');
    return `Resumen (mock): el contacto conversó sobre: ${topics}`;
  }

  async classifyIntent(input: ClassifyIntentInput): Promise<ClassifyIntentResult> {
    const intent = this.detectIntent(input.text);
    return { intent, confidence: intent === 'unknown' ? 0.4 : 0.8 };
  }

  async transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioResult> {
    // Ver MockTranscriptionProvider en apps/worker para la ruta usada por
    // el flujo de notas de voz; este método se ofrece también aquí porque
    // forma parte del contrato AiProvider.
    return {
      text: '[Transcripción simulada] Hola, este es un mensaje de voz de prueba generado por BIRVO.',
      language: input.languageHint ?? 'es',
      durationSeconds: 4,
      provider: this.name,
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return { healthy: true, provider: this.name };
  }

  private detectIntent(text: string): string {
    const normalized = text.toLowerCase();
    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      if (keywords.some((k) => normalized.includes(k))) return intent;
    }
    return 'unknown';
  }

  private buildReplyForIntent(intent: string, contactName: string): string {
    switch (intent) {
      case 'pricing':
        return `¡Hola ${contactName}! Con gusto te comparto nuestros planes. Un agente te dará el detalle completo en breve, mientras tanto: tenemos planes desde $29/mes.`;
      case 'support':
        return `Lamento el inconveniente, ${contactName}. Ya notifiqué a nuestro equipo de soporte para que revise tu caso con prioridad.`;
      case 'greeting':
        return `¡Hola ${contactName}! Gracias por escribir a BIRVO. ¿En qué puedo ayudarte hoy?`;
      case 'sales':
        return `¡Genial que quieras conocer más, ${contactName}! Te comparto una breve descripción y en un momento un agente se une a la conversación.`;
      default:
        return `Gracias por tu mensaje, ${contactName}. Un miembro de nuestro equipo te responderá en breve.`;
    }
  }
}
