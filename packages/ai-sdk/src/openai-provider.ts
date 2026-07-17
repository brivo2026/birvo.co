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

/**
 * Adaptador real preparado para un proveedor de IA basado en OpenAI (u
 * compatible). Queda desactivado si no hay OPENAI_API_KEY configurada; el
 * MVP nunca depende de esta clase para funcionar (usa MockAiProvider por
 * defecto vía AI_PROVIDER=mock).
 *
 * Nota: no se incluye el SDK de OpenAI como dependencia obligatoria del
 * MVP; al activar este proveedor en un entorno real, instalar `openai` y
 * completar las llamadas HTTP marcadas como TODO.
 */
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  readonly model: string;

  constructor(private readonly apiKey: string, model = 'gpt-4o-mini') {
    this.model = model;
  }

  private assertEnabled(): void {
    if (!this.apiKey) {
      throw new Error(
        'OpenAiProvider está desactivado: configura OPENAI_API_KEY para habilitarlo. ' +
          'El MVP usa AI_PROVIDER=mock por defecto y no requiere esta credencial.',
      );
    }
  }

  async generateReply(_input: GenerateReplyInput): Promise<AiReplyResult> {
    this.assertEnabled();
    throw new Error('TODO: implementar llamada real a OpenAI Chat Completions al activar credenciales.');
  }

  async summarizeConversation(_input: SummarizeConversationInput): Promise<string> {
    this.assertEnabled();
    throw new Error('TODO: implementar resumen real vía OpenAI al activar credenciales.');
  }

  async classifyIntent(_input: ClassifyIntentInput): Promise<ClassifyIntentResult> {
    this.assertEnabled();
    throw new Error('TODO: implementar clasificación real vía OpenAI al activar credenciales.');
  }

  async transcribeAudio(_input: TranscribeAudioInput): Promise<TranscribeAudioResult> {
    this.assertEnabled();
    throw new Error('TODO: implementar transcripción real (p. ej. Whisper) al activar credenciales.');
  }

  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.apiKey) {
      return { healthy: false, provider: this.name, message: 'OPENAI_API_KEY no configurada' };
    }
    return { healthy: true, provider: this.name };
  }
}
