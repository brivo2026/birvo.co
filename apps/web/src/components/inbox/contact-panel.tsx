'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTeamMembers } from '@/hooks/use-team-members';
import { useTags } from '@/hooks/use-tags';
import { formatRelativeTime } from '@/lib/utils';
import type { ConversationSummary, InternalNoteDto } from '@/types/api';
import { Plus, X, UserCircle2 } from 'lucide-react';

export function ContactPanel({ conversation }: { conversation: ConversationSummary }) {
  const queryClient = useQueryClient();
  const { data: members } = useTeamMembers();
  const { data: tags } = useTags();
  const [note, setNote] = useState('');

  const assignMutation = useMutation({
    mutationFn: (userId: string | null) => api.patch(`/conversations/${conversation.id}/assign`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversation.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const addTagMutation = useMutation({
    mutationFn: (tagId: string) => api.post(`/conversations/${conversation.id}/tags`, { tagId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversation', conversation.id] }),
  });

  const removeTagMutation = useMutation({
    mutationFn: (tagId: string) => api.delete(`/conversations/${conversation.id}/tags/${tagId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversation', conversation.id] }),
  });

  const { data: notes } = useQuery({
    queryKey: ['notes', conversation.id],
    queryFn: () => api.get<InternalNoteDto[]>(`/conversations/${conversation.id}/notes`),
  });

  const addNoteMutation = useMutation({
    mutationFn: (body: string) => api.post(`/conversations/${conversation.id}/notes`, { body }),
    onSuccess: () => {
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['notes', conversation.id] });
    },
  });

  const availableTags = (tags ?? []).filter((t) => !conversation.tags.some((ct) => ct.id === t.id));

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col overflow-y-auto border-l border-slate-100 bg-white p-5">
      <div className="flex flex-col items-center text-center">
        <Avatar name={conversation.contact.name} src={conversation.contact.avatarUrl} size={56} />
        <p className="mt-2 font-heading font-semibold text-slate-900">{conversation.contact.name}</p>
        <p className="text-xs text-slate-500">{conversation.contact.phone ?? 'Sin teléfono'}</p>
      </div>

      <section className="mt-6">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Canal</h3>
        <Badge variant="blue">{conversation.channel.displayName}</Badge>
      </section>

      <section className="mt-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Responsable</h3>
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          value={conversation.assignedUser?.id ?? ''}
          onChange={(e) => assignMutation.mutate(e.target.value || null)}
        >
          <option value="">Sin asignar</option>
          {members?.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name}
            </option>
          ))}
        </select>
      </section>

      <section className="mt-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Etiquetas</h3>
        <div className="flex flex-wrap gap-1.5">
          {conversation.tags.map((tag) => (
            <span
              key={tag.id}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: `${tag.color}1a`, color: tag.color }}
            >
              {tag.name}
              <button onClick={() => removeTagMutation.mutate(tag.id)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        {availableTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => addTagMutation.mutate(tag.id)}
                className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:border-birvo-purple hover:text-birvo-purple"
              >
                <Plus className="h-3 w-3" />
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 flex-1">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Notas internas</h3>
        <div className="space-y-2">
          {notes?.map((n) => (
            <div key={n.id} className="rounded-lg bg-amber-50 p-2.5 text-xs text-slate-700">
              <p>{n.body}</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                <UserCircle2 className="h-3 w-3" /> {n.author.name} · {formatRelativeTime(n.createdAt)}
              </p>
            </div>
          ))}
          {notes?.length === 0 && <p className="text-xs text-slate-400">Sin notas todavía.</p>}
        </div>
        <div className="mt-2 space-y-2">
          <Textarea
            rows={2}
            placeholder="Agregar una nota interna (solo visible para el equipo)…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!note.trim()}
            loading={addNoteMutation.isPending}
            onClick={() => note.trim() && addNoteMutation.mutate(note.trim())}
          >
            Agregar nota
          </Button>
        </div>
      </section>
    </aside>
  );
}
