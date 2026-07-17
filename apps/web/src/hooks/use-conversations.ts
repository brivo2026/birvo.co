'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { ConversationSummary, PaginatedResponse } from '@/types/api';
import { useSocketEvent } from './use-socket-event';

export interface ConversationFilters {
  status?: string;
  assignedUserId?: string; // 'me' | 'unassigned' | uuid
  channelAccountId?: string;
  tagId?: string;
  unreadOnly?: boolean;
  search?: string;
}

function buildQuery(filters: ConversationFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return params.toString();
}

export function useConversations(filters: ConversationFilters) {
  const queryClient = useQueryClient();
  const queryKey = ['conversations', filters];

  const query = useQuery({
    queryKey,
    queryFn: () => api.get<PaginatedResponse<ConversationSummary>>(`/conversations?${buildQuery(filters)}`),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['conversations'] });

  useSocketEvent('conversation.created', invalidate);
  useSocketEvent('conversation.updated', invalidate);
  useSocketEvent('conversation.assigned', invalidate);
  useSocketEvent('conversation.closed', invalidate);
  useSocketEvent('message.created', invalidate);

  return query;
}
