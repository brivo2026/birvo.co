'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface TeamMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  role: string;
  createdAt: string;
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: () => api.get<TeamMember[]>('/users'),
  });
}
