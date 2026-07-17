'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { MessageDto } from '@/types/api';
import { useSocketEvent } from './use-socket-event';
import { getSocket } from '@/lib/socket';

export function useMessages(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['messages', conversationId];

  const query = useQuery({
    queryKey,
    queryFn: () => api.get<{ items: MessageDto[]; nextCursor: string | null }>(`/conversations/${conversationId}/messages`),
    enabled: Boolean(conversationId),
  });

  // Los sockets solo se unen a `organization:{id}` y `user:{id}` (ver
  // realtime.gateway.ts); todos los eventos de conversación se publican ahí,
  // así que aquí filtramos por el conversationId activo en cada payload.
  useSocketEvent<{ conversationId: string; message: MessageDto }>('message.created', (payload) => {
    if (payload.conversationId !== conversationId) return;
    queryClient.setQueryData<{ items: MessageDto[]; nextCursor: string | null } | undefined>(queryKey, (old) => {
      if (!old) return old;
      if (old.items.some((m) => m.id === payload.message.id)) return old;
      return { ...old, items: [...old.items, payload.message] };
    });
  });

  useSocketEvent<{ conversationId: string; messageId: string; status: string }>('message.status.updated', (payload) => {
    if (payload.conversationId !== conversationId) return;
    queryClient.setQueryData<{ items: MessageDto[]; nextCursor: string | null } | undefined>(queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((m) => (m.id === payload.messageId ? { ...m, status: payload.status } : m)),
      };
    });
  });

  useSocketEvent<{ conversationId: string; messageId: string; status: string; text?: string }>(
    'message.transcription.updated',
    (payload) => {
      if (payload.conversationId !== conversationId) return;
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
    },
  );

  useEffect(() => {
    getSocket();
  }, []);

  return query;
}
