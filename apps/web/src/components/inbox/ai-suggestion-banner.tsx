'use client';

import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { useSocketEvent } from '@/hooks/use-socket-event';
import type { AiExecutionDto } from '@/types/api';

export function AiSuggestionBanner({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery({
    queryKey: ['ai-executions', conversationId],
    queryFn: () => api.get<AiExecutionDto[]>(`/ai/conversations/${conversationId}/executions`),
  });

  useSocketEvent<{ conversationId: string }>('ai.suggestion.created', (payload) => {
    if (payload.conversationId === conversationId) {
      setDismissed(false);
      queryClient.invalidateQueries({ queryKey: ['ai-executions', conversationId] });
    }
  });

  useEffect(() => setDismissed(false), [conversationId]);

  const latestSuggestion = data?.find((e) => e.result === 'suggested');

  const acceptMutation = useMutation({
    mutationFn: () => api.post(`/ai/conversations/${conversationId}/executions/${latestSuggestion?.id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['ai-executions', conversationId] });
    },
  });

  if (!latestSuggestion || dismissed || acceptMutation.isSuccess) return null;

  return (
    <div className="mx-4 mt-3 rounded-xl border border-birvo-purple/20 bg-birvo-purple/5 p-3">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-birvo-purple" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-birvo-purple">BIRVO IA sugiere</p>
          <p className="mt-0.5 text-sm text-slate-700">{latestSuggestion.output?.text}</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" loading={acceptMutation.isPending} onClick={() => acceptMutation.mutate()}>
              Usar sugerencia
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              Descartar
            </Button>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
