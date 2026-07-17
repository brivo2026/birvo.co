import { REALTIME_EVENTS_CHANNEL, type SocketEvent } from '@birvo/contracts';
import { redisConnection } from './redis';

export async function publishRealtimeEvent(event: SocketEvent | string, room: string, payload: unknown): Promise<void> {
  await redisConnection.publish(REALTIME_EVENTS_CHANNEL, JSON.stringify({ event, room, payload }));
}
