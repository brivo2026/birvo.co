'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Search, Inbox as InboxIcon } from 'lucide-react';
import { useConversations, type ConversationFilters } from '@/hooks/use-conversations';
import { ConversationListItem } from './conversation-list-item';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ConnectionBadge } from '@/components/layout/connection-badge';
import { cn } from '@/lib/utils';

const QUICK_FILTERS: Array<{ key: string; label: string; filters: ConversationFilters }> = [
  { key: 'all', label: 'Todas', filters: {} },
  { key: 'unread', label: 'No leídas', filters: { unreadOnly: true } },
  { key: 'mine', label: 'Asignadas a mí', filters: { assignedUserId: 'me' } },
  { key: 'unassigned', label: 'Sin asignar', filters: { assignedUserId: 'unassigned' } },
  { key: 'requires_human', label: 'Requiere atención', filters: { status: 'requires_human' } },
];

export function ConversationList() {
  const params = useParams<{ conversationId?: string }>();
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filters: ConversationFilters = { ...QUICK_FILTERS.find((f) => f.key === activeFilter)?.filters, search };
  const { data, isLoading, isError } = useConversations(filters);

  return (
    <div className="flex h-full w-[360px] shrink-0 flex-col border-r border-slate-100 bg-white">
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-slate-900">Bandeja</h2>
          <ConnectionBadge />
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nombre o teléfono…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                activeFilter === f.key ? 'bg-birvo-purple text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex h-40 items-center justify-center">
            <Spinner />
          </div>
        )}
        {isError && (
          <div className="p-4 text-center text-sm text-red-600">
            No se pudieron cargar las conversaciones. Intenta recargar.
          </div>
        )}
        {!isLoading && !isError && data?.items.length === 0 && (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-slate-400">
            <InboxIcon className="h-8 w-8" strokeWidth={1.5} />
            No hay conversaciones aquí todavía.
          </div>
        )}
        {data?.items.map((conversation) => (
          <ConversationListItem
            key={conversation.id}
            conversation={conversation}
            active={params?.conversationId === conversation.id}
          />
        ))}
      </div>
    </div>
  );
}
