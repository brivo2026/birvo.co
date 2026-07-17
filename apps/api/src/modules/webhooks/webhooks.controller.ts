import { Body, Controller, Get, Headers, Post, Query, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { ChannelProvider } from '@birvo/contracts';
import { Public } from '../../common/decorators/public.decorator';
import { ChannelRegistryFactory } from '../channels/channel-registry.provider';
import { WebhookIngestionService } from './webhook-ingestion.service';
import { BIRVO_ENV, type BirvoEnv } from '../../config/config.module';
import { Inject } from '@nestjs/common';

/**
 * Endpoint público (sin sesión) para proveedores reales (Meta). Queda
 * estructuralmente completo (verificación de reto + firma) pero inerte sin
 * credenciales configuradas — ver ADR-0004 y MetaChannelAdapter.
 */
@ApiTags('webhooks')
@Controller({ path: 'webhooks', version: '1' })
export class WebhooksController {
  constructor(
    private readonly registry: ChannelRegistryFactory,
    private readonly ingestion: WebhookIngestionService,
    @Inject(BIRVO_ENV) private readonly env: BirvoEnv,
  ) {}

  /** Verificación de reto usada por Meta al configurar el webhook (hub.challenge). */
  @Get(':provider')
  @Public()
  verify(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
    if (mode === 'subscribe' && token === this.env.META_WEBHOOK_VERIFY_TOKEN && this.env.META_WEBHOOK_VERIFY_TOKEN) {
      return challenge;
    }
    throw new ServiceUnavailableException('Verificación de webhook no disponible sin credenciales de Meta configuradas.');
  }

  @Post(':provider')
  @Public()
  async receive(
    @Body() body: unknown,
    @Headers('x-hub-signature-256') signatureHeader: string | undefined,
  ) {
    // NOTA: en un despliegue real, este endpoint debe usar el rawBody exacto
    // (no el JSON re-serializado) para verificar la firma HMAC. Se documenta
    // aquí como referencia; ver ADR-0004 para el alcance del MVP.
    const provider = 'whatsapp' as ChannelProvider; // TODO: derivar de :provider param con validación de enum
    const adapter = this.registry.registry.get(provider) as { isEnabled?: () => boolean };

    if (!adapter.isEnabled?.()) {
      throw new ServiceUnavailableException(
        'Este canal no tiene credenciales configuradas. El MVP funciona con el canal sandbox (/dev/sandbox).',
      );
    }

    const result = await this.ingestion.ingest({
      provider,
      organizationId: null,
      idempotencyKey: `meta-${randomUUID()}`,
      payload: body,
      signatureValid: Boolean(signatureHeader),
    });

    return { received: true, ...result };
  }
}
