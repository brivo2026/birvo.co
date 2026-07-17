import { createLogger, type Logger } from '@birvo/logger';
import { loadEnv } from '@birvo/config';

export const env = loadEnv();
export const logger: Logger = createLogger({ serviceName: 'birvo-worker', level: env.LOG_LEVEL });
