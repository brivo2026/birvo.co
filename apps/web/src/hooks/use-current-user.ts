'use client';

import { useQuery } from '@tanstack/react-query';
import type { SessionUser } from '@birvo/contracts';
import { api } from '@/lib/api-client';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get<{ user: SessionUser }>('/auth/me'),
    retry: false,
    staleTime: 60_000,
  });
}
