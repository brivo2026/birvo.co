import { Injectable } from '@nestjs/common';
import { REALTIME_EVENTS_CHANNEL, type SocketEvent } from '@birvo/contracts';
import { RedisConnectionFactory } from '../queue/redis.provider';

/**
 * Publica eventos de dominio en el canal de Redis Pub/Sub que consume
 * RealtimeGateway. Se usa tanto desde apps/api (cambios originados por un
 * agente vía REST) como, de forma equivalente, desde apps/worker (cambios
 * originados por el procesamiento asíncrono).
 */
@Injectable()
export class RealtimePublisherService {
  constructor(private readonly redis: RedisConnectionFactory) {}

  async publish(event: SocketEvent | string, room: string, payload: unknown): Promise<void> {
    await this.redis.connection.publish(REALTIME_EVENTS_CHANNEL, JSON.stringify({ event, room, payload }));
  }
}
