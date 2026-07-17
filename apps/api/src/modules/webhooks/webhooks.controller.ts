import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Post, Query, Req, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { ChannelProvider, type ChannelProvider as ChannelProviderType } from '@birvo/contracts';
import { Public } from '../../common/decorators/public.decorator';
import { ChannelRegistryFactory } from '../channels/channel-registry.provider';
import { WebhookIngestionService } from './webhook-ingestion.service';
import { BIRVO_ENV, type BirvoEnv } from '../../config/config.module';

const REAL_PROVIDERS = new Set<string>([ChannelProvider.WHATSAPP, ChannelProvider.INSTAGRAM, ChannelProvider.MESSENGER]);

function parseProvider(provider: string): ChannelProviderType {
  if (!REAL_PROVIDERS.has(provider)) {
    throw new BadRequestException(`Proveedor de webhook desconocido: ${provider}`);
  }
  return provider as ChannelProviderType;
}

/**
 * Endpoint público (sin sesión) para proveedores reales (Meta). El envío y
 * la normalización real están implementados en `MetaChannelAdapter` — ver
 * docs/integrations/meta.md para qué falta verificar contra tráfico real.
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
  verify(
    @Param('provider') provider: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    parseProvider(provider);
    if (mode === 'subscribe' && token === this.env.META_WEBHOOK_VERIFY_TOKEN && this.env.META_WEBHOOK_VERIFY_TOKEN) {
      return challenge;
    }
    throw new ServiceUnavailableException('Verificación de webhook no disponible sin credenciales de Meta configuradas.');
  }

  @Post(':provider')
  @Public()
  async receive(
    @Param('provider') providerParam: string,
    @Body() body: unknown,
    @Headers('x-hub-signature-256') signatureHeader: string | undefined,
    @Req() request: FastifyRequest & { rawBody?: Buffer },
  ) {
    const provider = parseProvider(providerParam);
    const adapter = this.registry.registry.get(provider) as {
      isEnabled?: () => boolean;
      verifyWebhookSignature: (input: { rawBody: string | Buffer; signatureHeader: string | undefined; secret: string }) => Promise<boolean>;
    };

    if (!adapter.isEnabled?.()) {
      throw new ServiceUnavailableException(
        'Este canal no tiene credenciales configuradas. El MVP funciona con el canal sandbox (/dev/sandbox).',
      );
    }

    const rawBody = request.rawBody ?? Buffer.from(JSON.stringify(body));
    const signatureValid = await adapter.verifyWebhookSignature({
      rawBody,
      signatureHeader,
      secret: this.env.META_APP_SECRET,
    });

    const result = await this.ingestion.ingest({
      provider,
      organizationId: null,
      idempotencyKey: `meta-${provider}-${randomUUID()}`,
      payload: body,
      signatureValid,
    });

    return { received: true, ...result };
  }
}
