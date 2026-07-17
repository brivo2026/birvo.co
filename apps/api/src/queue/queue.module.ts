import { Global, Module } from '@nestjs/common';
import { RedisConnectionFactory } from './redis.provider';
import { QueueService } from './queue.service';

@Global()
@Module({
  providers: [RedisConnectionFactory, QueueService],
  exports: [RedisConnectionFactory, QueueService],
})
export class QueueModule {}
