import { Inject, Injectable } from '@nestjs/common';
import { ChannelRegistry, MetaChannelAdapter, SandboxChannelAdapter } from '@birvo/channel-sdk';
import { BIRVO_ENV, type BirvoEnv } from '../../config/config.module';

export const CHANNEL_REGISTRY = Symbol('CHANNEL_REGISTRY');

/**
 * Construye y registra los adaptadores de canal disponibles en el proceso.
 * SandboxChannelAdapter siempre está disponible; MetaChannelAdapter se
 * registra igualmente pero queda desactivado (isEnabled() === false) si no
 * hay credenciales — ver ADR-0004.
 */
@Injectable()
export class ChannelRegistryFactory {
  readonly registry: ChannelRegistry;

  constructor(@Inject(BIRVO_ENV) env: BirvoEnv) {
    this.registry = new ChannelRegistry();
    this.registry.register(new SandboxChannelAdapter());
    this.registry.register(
      new MetaChannelAdapter('whatsapp', {
        appSecret: env.META_APP_SECRET || undefined,
        pageOrPhoneToken: env.WHATSAPP_CLOUD_API_TOKEN || undefined,
      }),
    );
    this.registry.register(
      new MetaChannelAdapter('instagram', {
        appSecret: env.META_APP_SECRET || undefined,
        pageOrPhoneToken: env.INSTAGRAM_PAGE_TOKEN || undefined,
      }),
    );
    this.registry.register(
      new MetaChannelAdapter('messenger', {
        appSecret: env.META_APP_SECRET || undefined,
        pageOrPhoneToken: env.MESSENGER_PAGE_TOKEN || undefined,
      }),
    );
  }
}
