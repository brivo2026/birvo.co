'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { ConversationSummary } from '@/types/api';
import { CONVERSATION_STATUS_OPTIONS } from '@/lib/conversation-status';

export function ConversationHeader({ conversation }: { conversation: ConversationSummary }) {
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/conversations/${conversation.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversation.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return (
    <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5">
      <div className="flex items-center gap-3">
        <Avatar name={conversation.contact.name} src={conversation.contact.avatarUrl} />
        <div>
          <p className="font-heading font-semibold text-slate-900">{conversation.contact.name}</p>
          <p className="text-xs text-slate-500">
            {conversation.channel.displayName} · {conversation.contact.phone ?? 'sin teléfono'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {conversation.status === 'requires_human' && (
          <Badge variant="danger">Requiere atención humana</Badge>
        )}
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-birvo-purple/30"
          value={conversation.status}
          onChange={(e) => statusMutation.mutate(e.target.value)}
        >
          {CONVERSATION_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
