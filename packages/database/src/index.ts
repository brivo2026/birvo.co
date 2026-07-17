import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

let prismaSingleton: PrismaClient | undefined;

/**
 * Devuelve una instancia única de PrismaClient por proceso. apps/api y
 * apps/worker deben usar esta fábrica en vez de instanciar `new
 * PrismaClient()` directamente para evitar agotar el pool de conexiones.
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? [{ level: 'warn', emit: 'stdout' }, { level: 'error', emit: 'stdout' }]
          : [{ level: 'error', emit: 'stdout' }],
    });
  }
  return prismaSingleton;
}
