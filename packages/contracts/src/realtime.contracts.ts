import { z } from 'zod';

/**
 * Canal de Redis Pub/Sub usado por apps/worker para notificar a apps/api
 * (que reenvía por Socket.IO) sobre cambios de dominio ocurridos en un
 * proceso distinto. Ver docs/architecture/overview.md §4.
 */
export const REALTIME_EVENTS_CHANNEL = 'birvo:realtime-events';

export const realtimeEventEnvelopeSchema = z.object({
  event: z.string(),
  room: z.string(),
  payload: z.unknown(),
});
export type RealtimeEventEnvelope = z.infer<typeof realtimeEventEnvelopeSchema>;
