'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { TagDto } from '@/types/api';

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get<TagDto[]>('/tags'),
  });
}
