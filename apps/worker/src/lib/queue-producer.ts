import { Queue } from 'bullmq';
import {
  JobName,
  QueueName,
  type EvaluateInactivityTimeoutJob,
  type SendOutboundMessageJob,
  type SimulateDeliveryProgressionJob,
  type TranscribeAttachmentJob,
} from '@birvo/contracts';
import { redisConnection } from './redis';

const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 500 },
  removeOnFail: false,
};

const outboundMessagesQueue = new Queue(QueueName.OUTBOUND_MESSAGES, { connection: redisConnection });
const automationTimersQueue = new Queue(QueueName.AUTOMATION_TIMERS, { connection: redisConnection });
const transcriptionsQueue = new Queue(QueueName.TRANSCRIPTIONS, { connection: redisConnection });

/** Usado cuando la propia IA genera y envía una respuesta automática (§10), reutilizando el mismo flujo de envío que un agente humano. */
export async function enqueueOutboundMessage(job: SendOutboundMessageJob): Promise<void> {
  await outboundMessagesQueue.add(JobName.SEND_OUTBOUND_MESSAGE, job, DEFAULT_JOB_OPTIONS);
}

export async function enqueueDeliveryProgression(job: SimulateDeliveryProgressionJob, delayMs: number): Promise<void> {
  await outboundMessagesQueue.add(JobName.SIMULATE_DELIVERY_PROGRESSION, job, { ...DEFAULT_JOB_OPTIONS, delay: delayMs });
}

function inactivityJobId(conversationId: string): string {
  return `inactivity-${conversationId}`;
}

/** Programa (o reprograma) el temporizador de inactividad de una conversación. Ver §10. */
export async function scheduleInactivityTimeout(job: EvaluateInactivityTimeoutJob, delayMs: number): Promise<void> {
  const jobId = inactivityJobId(job.conversationId);
  await cancelInactivityTimeout(job.conversationId);
  await automationTimersQueue.add(JobName.EVALUATE_INACTIVITY_TIMEOUT, job, {
    ...DEFAULT_JOB_OPTIONS,
    delay: delayMs,
    jobId,
  });
}

export async function cancelInactivityTimeout(conversationId: string): Promise<void> {
  const jobId = inactivityJobId(conversationId);
  const existing = await automationTimersQueue.getJob(jobId);
  if (existing) {
    const state = await existing.getState();
    if (state === 'delayed' || state === 'waiting') {
      await existing.remove();
    }
  }
}

export async function enqueueTranscription(job: TranscribeAttachmentJob): Promise<void> {
  await transcriptionsQueue.add(JobName.TRANSCRIBE_ATTACHMENT, job, DEFAULT_JOB_OPTIONS);
}
