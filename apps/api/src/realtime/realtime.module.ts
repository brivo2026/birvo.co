import { Global, Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimePublisherService } from './realtime-publisher.service';
import { AuthModule } from '../modules/auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  providers: [RealtimeGateway, RealtimePublisherService],
  exports: [RealtimeGateway, RealtimePublisherService],
})
export class RealtimeModule {}
