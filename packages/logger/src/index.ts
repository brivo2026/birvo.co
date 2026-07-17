import pino, { type Logger } from 'pino';

export interface CreateLoggerOptions {
  serviceName: string;
  level?: string;
  pretty?: boolean;
}

/**
 * Crea un logger Pino estructurado. Cada log incluye `service` y admite
 * `correlationId` como campo (ver `withCorrelationId`) para trazabilidad
 * de extremo a extremo entre API y Worker.
 */
export function createLogger(options: CreateLoggerOptions): Logger {
  const { serviceName, level = 'info', pretty = process.env.NODE_ENV !== 'production' } = options;

  return pino({
    level,
    base: { service: serviceName },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.passwordHash',
        '*.token',
        '*.secret',
        '*.encryptedCredentials',
      ],
      censor: '[REDACTED]',
    },
    transport: pretty
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        }
      : undefined,
  });
}

export function withCorrelationId(logger: Logger, correlationId: string): Logger {
  return logger.child({ correlationId });
}

export type { Logger };
