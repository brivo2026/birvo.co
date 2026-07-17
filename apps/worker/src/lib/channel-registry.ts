import { ChannelRegistry, MetaChannelAdapter, SandboxChannelAdapter } from '@birvo/channel-sdk';
import { env } from './logger';

export const channelRegistry = new ChannelRegistry();
channelRegistry.register(new SandboxChannelAdapter());
channelRegistry.register(
  new MetaChannelAdapter('whatsapp', {
    appSecret: env.META_APP_SECRET || undefined,
    pageOrPhoneToken: env.WHATSAPP_CLOUD_API_TOKEN || undefined,
  }),
);
channelRegistry.register(
  new MetaChannelAdapter('instagram', {
    appSecret: env.META_APP_SECRET || undefined,
    pageOrPhoneToken: env.INSTAGRAM_PAGE_TOKEN || undefined,
  }),
);
channelRegistry.register(
  new MetaChannelAdapter('messenger', {
    appSecret: env.META_APP_SECRET || undefined,
    pageOrPhoneToken: env.MESSENGER_PAGE_TOKEN || undefined,
  }),
);
