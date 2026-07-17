import { Global, Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelRegistryFactory } from './channel-registry.provider';

@Global()
@Module({
  controllers: [ChannelsController],
  providers: [ChannelRegistryFactory],
  exports: [ChannelRegistryFactory],
})
export class ChannelsModule {}
