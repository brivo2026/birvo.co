import { z } from 'zod';

/**
 * Esquema de validación de variables de entorno compartido por `apps/api` y
 * `apps/worker`. Falla rápido (fail-fast) en el arranque si falta o es
 * inválida alguna variable crítica, en vez de fallar silenciosamente en
 * tiempo de ejecución.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('BIRVO'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('debug'),

  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default('0.0.0.0'),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  WEB_BASE_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  SESSION_COOKIE_NAME: z.string().default('birvo_session'),
  SESSION_JWT_SECRET: z.string().min(16, 'SESSION_JWT_SECRET debe tener al menos 16 caracteres'),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
  SESSION_REFRESH_TTL_DAYS: z.coerce.number().positive().default(14),

  CREDENTIALS_ENCRYPTION_KEY: z.string().min(16),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().positive().default(120),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().positive().default(10),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  STORAGE_DRIVER: z.enum(['s3', 'local']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./storage/uploads'),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().default(''),
  S3_SECRET_ACCESS_KEY: z.string().default(''),
  S3_BUCKET: z.string().default('birvo-attachments'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  S3_PUBLIC_URL: z.string().default('http://localhost:9000/birvo-attachments'),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_FROM: z.string().default('no-reply@birvo.local'),

  META_APP_ID: z.string().optional().default(''),
  META_APP_SECRET: z.string().optional().default(''),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional().default(''),
  WHATSAPP_CLOUD_API_TOKEN: z.string().optional().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(''),
  INSTAGRAM_PAGE_TOKEN: z.string().optional().default(''),
  MESSENGER_PAGE_TOKEN: z.string().optional().default(''),
  SANDBOX_CHANNEL_ENABLED: z.coerce.boolean().default(true),

  AI_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  TRANSCRIPTION_PROVIDER: z.enum(['mock']).default('mock'),

  WORKER_CONCURRENCY: z.coerce.number().positive().default(5),
  INACTIVITY_TIMER_DEFAULT_MINUTES: z.coerce.number().positive().default(5),

  OTEL_ENABLED: z.coerce.boolean().default(false),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4318'),
  OTEL_SERVICE_NAME: z.string().default('birvo-api'),
});

export type BirvoEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): BirvoEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuración de entorno inválida:\n${details}`);
  }
  return parsed.data;
}
