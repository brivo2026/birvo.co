import type { Job } from 'bullmq';
import { prisma } from './prisma';
import { logger } from './logger';

/**
 * Se invoca desde el listener 'failed' de cada Worker cuando un job agota
 * todos sus reintentos (dead-letter). Para jobs de webhook, además marca el
 * WebhookEvent correspondiente como `dead_letter` para que quede visible en
 * auditoría/soporte.
 */
export async function handleExhaustedRetries(job: Job, error: Error): Promise<void> {
  logger.error(
    { jobId: job.id, queue: job.queueName, name: job.name, attempts: job.attemptsMade, err: error.message },
    'Job movido a dead-letter tras agotar reintentos',
  );

  if (job.name === 'process-webhook-event' && job.data?.webhookEventId) {
    await prisma.webhookEvent
      .update({
        where: { id: job.data.webhookEventId },
        data: { status: 'dead_letter', lastError: error.message },
      })
      .catch(() => undefined);
  }
}
