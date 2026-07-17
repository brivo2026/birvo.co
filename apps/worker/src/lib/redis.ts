import IORedis from 'ioredis';
import { env } from './logger';

export const redisConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
