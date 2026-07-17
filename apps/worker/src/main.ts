import { Worker, type Job } from 'bullmq';
import { JobName, QueueName } from '@birvo/contracts';
import { env, logger } from './lib/logger';
import { redisConnection } from './lib/redis';
import { prisma } from './lib/prisma';
import { handleExhaustedRetries } from './lib/dead-letter';
import { processWebhookJob } from './processors/webhook.processor';
import { sendOutboundMessage, simulateDeliveryProgression } from './processors/outbound-message.processor';
import { evaluateInactivityTimeout } from './processors/inactivity-timer.processor';
import { transcribeAttachment } from './processors/transcription.processor';

const concurrency = env.WORKER_CONCURRENCY;

const webhooksWorker = new Worker(
  QueueName.WEBHOOKS,
  async (job) => {
    if (job.name === JobName.PROCESS_WEBHOOK_EVENT) return processWebhookJob(job);
  },
  { connection: redisConnection, concurrency },
);

const outboundMessagesWorker = new Worker(
  QueueName.OUTBOUND_MESSAGES,
  async (job) => {
    if (job.name === JobName.SEND_OUTBOUND_MESSAGE) return sendOutboundMessage(job);
    if (job.name === JobName.SIMULATE_DELIVERY_PROGRESSION) return simulateDeliveryProgression(job);
  },
  { connection: redisConnection, concurrency },
);

const automationTimersWorker = new Worker(
  QueueName.AUTOMATION_TIMERS,
  async (job) => {
    if (job.name === JobName.EVALUATE_INACTIVITY_TIMEOUT) return evaluateInactivityTimeout(job);
  },
  { connection: redisConnection, concurrency },
);

const transcriptionsWorker = new Worker(
  QueueName.TRANSCRIPTIONS,
  async (job) => {
    if (job.name === JobName.TRANSCRIBE_ATTACHMENT) return transcribeAttachment(job);
  },
  { connection: redisConnection, concurrency },
);

const allWorkers = [webhooksWorker, outboundMessagesWorker, automationTimersWorker, transcriptionsWorker];

for (const worker of allWorkers) {
  worker.on('completed', (job: Job) => {
    logger.debug({ queue: job.queueName, jobId: job.id, name: job.name }, 'Job completado');
  });

  worker.on('failed', async (job, error) => {
    if (!job) return;
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= maxAttempts) {
      await handleExhaustedRetries(job, error);
    } else {
      logger.warn(
        { queue: job.queueName, jobId: job.id, name: job.name, attempt: job.attemptsMade, err: error.message },
        'Job falló, BullMQ reintentará con backoff exponencial',
      );
    }
  });
}

logger.info(
  { queues: allWorkers.map((w) => w.name), concurrency, aiProvider: env.AI_PROVIDER, storageDriver: env.STORAGE_DRIVER },
  '🚀 BIRVO Worker escuchando colas',
);

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Apagando BIRVO Worker...');
  await Promise.all(allWorkers.map((w) => w.close()));
  await prisma.$disconnect();
  redisConnection.disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
