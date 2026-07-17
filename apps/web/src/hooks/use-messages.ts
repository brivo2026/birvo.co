'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { MessageDto } from '@/types/api';
import { useSocketEvent } from './use-socket-event';
import { getSocket } from '@/lib/socket';
import { conversationRoomName } from '@/lib/rooms';

export function useMessages(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['messages', conversationId];

  const query = useQuery({
    queryKey,
    queryFn: () => api.get<{ items: MessageDto[]; nextCursor: string | null }>(`/conversations/${conversationId}/messages`),
    enabled: Boolean(conversationId),
  });

  // El backend organiza las rooms por conversación; unirse explícitamente
  // no es necesario porque el gateway ya agrega al socket a
  // `organization:{id}` y a `user:{id}`. Los eventos de conversación
  // también se publican a `conversation:{id}`, así que aquí simplemente
  // filtramos por el id activo.
  useEffect(() => {
    void conversationRoomName; // referencia documental, ver socket-events.ts en @birvo/contracts
  }, []);

  useSocketEvent<MessageDto & { conversationId?: string }>('message.created', (payload) => {
    queryClient.setQueryData<{ items: MessageDto[]; nextCursor: string | null } | undefined>(queryKey, (old) => {
      if (!old) return old;
      if (old.items.some((m) => m.id === payload.id)) return old;
      return { ...old, items: [...old.items, payload as MessageDto] };
    });
  });

  useSocketEvent<{ messageId: string; status: string }>('message.status.updated', (payload) => {
    queryClient.setQueryData<{ items: MessageDto[]; nextCursor: string | null } | undefined>(queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((m) => (m.id === payload.messageId ? { ...m, status: payload.status } : m)),
      };
    });
  });

  useSocketEvent<{ messageId: string; status: string; text?: string }>('message.transcription.updated', (payload) => {
    queryClient.setQueryData<{ items: MessageDto[]; nextCursor: string | null } | undefined>(queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((m) =>
          m.id === payload.messageId
            ? {
                ...m,
                attachments: m.attachments.map((a) => ({
                  ...a,
                  transcriptionStatus: payload.status,
                  transcriptionText: payload.text ?? a.transcriptionText,
                })),
              }
            : m,
        ),
      };
    });
  });

  useEffect(() => {
    getSocket();
  }, []);

  return query;
}
