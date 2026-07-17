'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { ConversationSummary } from '@/types/api';
import { useSocketEvent } from './use-socket-event';

export function useConversationDetail(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['conversation', conversationId];

  const query = useQuery({
    queryKey,
    queryFn: () => api.get<ConversationSummary>(`/conversations/${conversationId}`),
    enabled: Boolean(conversationId),
  });

  useSocketEvent<{ conversationId: string }>('conversation.updated', (payload) => {
    if (payload.conversationId === conversationId) {
      queryClient.invalidateQueries({ queryKey });
    }
  });
  useSocketEvent<{ conversationId: string }>('conversation.assigned', (payload) => {
    if (payload.conversationId === conversationId) {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  return query;
}
