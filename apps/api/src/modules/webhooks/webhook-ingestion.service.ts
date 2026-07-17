import { Injectable, Logger } from '@nestjs/common';
import type { ChannelProvider } from '@birvo/contracts';
import type { Prisma } from '@birvo/database';
import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../../queue/queue.service';

export interface IngestResult {
  status: 'queued' | 'duplicate_ignored';
  webhookEventId: string;
}

/**
 * Punto único de entrada para CUALQUIER webhook entrante (real o sandbox):
 * guarda el evento crudo, aplica idempotencia y encola el procesamiento.
 * Ver flujo completo en docs/architecture/overview.md §4.
 */
@Injectable()
export class WebhookIngestionService {
  private readonly logger = new Logger(WebhookIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async ingest(input: {
    provider: ChannelProvider;
    organizationId: string | null;
    idempotencyKey: string;
    /** Payload crudo del proveedor (forma variable según canal); se persiste tal cual en WebhookEvent.payload (Json). */
    payload: unknown;
    signatureValid: boolean;
  }): Promise<IngestResult> {
    const existing = await this.prisma.client.webhookEvent.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });

    if (existing) {
      this.logger.log(`Webhook duplicado ignorado (idempotencyKey=${input.idempotencyKey})`);
      return { status: 'duplicate_ignored', webhookEventId: existing.publicId };
    }

    const event = await this.prisma.client.webhookEvent.create({
      data: {
        organizationId: input.organizationId,
        provider: input.provider,
        idempotencyKey: input.idempotencyKey,
        // El payload de un webhook tiene forma variable según el proveedor
        // (sandbox vs. Meta); se persiste tal cual como Json. Cast
        // justificado: Prisma.InputJsonValue no puede modelar "cualquier
        // payload serializable" sin perder la forma concreta en cada adaptador.
        payload: input.payload as Prisma.InputJsonValue,
        signatureValid: input.signatureValid,
        status: 'received',
      },
    });

    await this.queue.enqueueWebhookProcessing({ webhookEventId: event.id });

    return { status: 'queued', webhookEventId: event.publicId };
  }
}
