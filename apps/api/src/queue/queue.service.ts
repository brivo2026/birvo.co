import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  JobName,
  QueueName,
  type EvaluateInactivityTimeoutJob,
  type ProcessWebhookJob,
  type SendOutboundMessageJob,
  type SimulateDeliveryProgressionJob,
  type TranscribeAttachmentJob,
} from '@birvo/contracts';
import { RedisConnectionFactory } from './redis.provider';
import { PrismaService } from '../database/prisma.service';

const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 500 },
  removeOnFail: false, // se conservan para inspección / dead-letter
};

/**
 * Fachada de producción de jobs. apps/api SOLO encola trabajo; el
 * procesamiento ocurre en apps/worker (ver docs/architecture/overview.md).
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly webhooksQueue: Queue<ProcessWebhookJob>;
  private readonly outboundMessagesQueue: Queue<SendOutboundMessageJob | SimulateDeliveryProgressionJob>;
  private readonly automationTimersQueue: Queue<EvaluateInactivityTimeoutJob>;
  private readonly transcriptionsQueue: Queue<TranscribeAttachmentJob>;

  constructor(
    redis: RedisConnectionFactory,
    private readonly prisma: PrismaService,
  ) {
    const connection = redis.connection;
    this.webhooksQueue = new Queue(QueueName.WEBHOOKS, { connection });
    this.outboundMessagesQueue = new Queue(QueueName.OUTBOUND_MESSAGES, { connection });
    this.automationTimersQueue = new Queue(QueueName.AUTOMATION_TIMERS, { connection });
    this.transcriptionsQueue = new Queue(QueueName.TRANSCRIPTIONS, { connection });
  }

  async enqueueWebhookProcessing(job: ProcessWebhookJob): Promise<void> {
    await this.webhooksQueue.add(JobName.PROCESS_WEBHOOK_EVENT, job, DEFAULT_JOB_OPTIONS);
  }

  async enqueueOutboundMessage(job: SendOutboundMessageJob): Promise<void> {
    await this.outboundMessagesQueue.add(JobName.SEND_OUTBOUND_MESSAGE, job, DEFAULT_JOB_OPTIONS);
  }

  async enqueueDeliveryProgression(job: SimulateDeliveryProgressionJob, delayMs: number): Promise<void> {
    await this.outboundMessagesQueue.add(JobName.SIMULATE_DELIVERY_PROGRESSION, job, {
      ...DEFAULT_JOB_OPTIONS,
      delay: delayMs,
    });
  }

  /** jobId determinista por conversación: permite cancelar el temporizador si un agente responde antes. */
  private inactivityJobId(conversationId: string): string {
    return `inactivity-${conversationId}`;
  }

  async scheduleInactivityTimeout(job: EvaluateInactivityTimeoutJob, delayMs: number): Promise<void> {
    const jobId = this.inactivityJobId(job.conversationId);
    await this.cancelInactivityTimeout(job.conversationId);
    await this.automationTimersQueue.add(JobName.EVALUATE_INACTIVITY_TIMEOUT, job, {
      ...DEFAULT_JOB_OPTIONS,
      delay: delayMs,
      jobId,
    });
  }

  async cancelInactivityTimeout(conversationId: string): Promise<void> {
    const jobId = this.inactivityJobId(conversationId);
    const existing = await this.automationTimersQueue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'delayed' || state === 'waiting') {
        await existing.remove();
        await this.prisma.client.automationRun.updateMany({
          where: { conversationId, status: 'scheduled' },
          data: { status: 'cancelled', result: { reason: 'un agente respondió antes del temporizador' } },
        });
      }
    }
  }

  async enqueueTranscription(job: TranscribeAttachmentJob): Promise<void> {
    await this.transcriptionsQueue.add(JobName.TRANSCRIBE_ATTACHMENT, job, DEFAULT_JOB_OPTIONS);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.webhooksQueue.close(),
      this.outboundMessagesQueue.close(),
      this.automationTimersQueue.close(),
      this.transcriptionsQueue.close(),
    ]);
  }
}
