'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export function Composer({ conversationId, canReply }: { conversationId: string; canReply: boolean }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/conversations/${conversationId}/messages`, { messageType: 'text', content }),
    onSuccess: () => {
      setText('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : 'No se pudo enviar el mensaje.'),
  });

  if (!canReply) {
    return (
      <div className="border-t border-slate-100 bg-white p-4 text-center text-sm text-slate-400">
        No tienes permisos para responder esta conversación.
      </div>
    );
  }

  return (
    <div className="border-t border-slate-100 bg-white p-4">
      {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700">{error}</p>}
      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          placeholder="Escribe una respuesta…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) mutation.mutate(text.trim());
            }
          }}
        />
        <Button
          size="icon"
          disabled={!text.trim()}
          loading={mutation.isPending}
          onClick={() => text.trim() && mutation.mutate(text.trim())}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
