import { MockAiProvider, OpenAiProvider, type AiProvider } from '@birvo/ai-sdk';
import { env } from './logger';

export const aiProvider: AiProvider =
  env.AI_PROVIDER === 'openai' ? new OpenAiProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL) : new MockAiProvider();
