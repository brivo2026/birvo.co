import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import IORedis, { Redis } from 'ioredis';
import { BIRVO_ENV, type BirvoEnv } from '../config/config.module';

export const REDIS_CONNECTION = Symbol('REDIS_CONNECTION');

@Injectable()
export class RedisConnectionFactory implements OnModuleDestroy {
  readonly connection: Redis;

  constructor(@Inject(BIRVO_ENV) env: BirvoEnv) {
    this.connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }

  async onModuleDestroy(): Promise<void> {
    this.connection.disconnect();
  }
}
