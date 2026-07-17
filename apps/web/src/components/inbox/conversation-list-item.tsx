'use client';

import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { ConversationSummary } from '@/types/api';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'neutral' | 'danger' | 'default'> = {
  open: 'success',
  pending: 'warning',
  resolved: 'neutral',
  closed: 'neutral',
  requires_human: 'danger',
};

const LAST_MESSAGE_TYPE_LABEL: Record<string, string> = {
  audio: '🎤 Nota de voz',
  image: '📷 Imagen',
  file: '📎 Archivo',
};

function lastMessagePreview(lastMessage: ConversationSummary['lastMessage']): string {
  if (!lastMessage) return 'Sin mensajes todavía';
  return lastMessage.content || LAST_MESSAGE_TYPE_LABEL[lastMessage.type] || 'Sin mensajes todavía';
}

export function ConversationListItem({ conversation, active }: { conversation: ConversationSummary; active: boolean }) {
  return (
    <Link
      href={`/inbox/${conversation.id}`}
      className={cn(
        'flex gap-3 rounded-xl px-3 py-3 transition-colors',
        active ? 'bg-birvo-purple/10' : 'hover:bg-slate-50',
      )}
    >
      <Avatar name={conversation.contact.name} src={conversation.contact.avatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-900">{conversation.contact.name}</p>
          <span className="shrink-0 text-[11px] text-slate-400">{formatRelativeTime(conversation.lastMessageAt)}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {conversation.lastMessage && conversation.lastMessage.direction === 'outbound' ? 'Tú: ' : ''}
          {lastMessagePreview(conversation.lastMessage)}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <Badge variant={STATUS_VARIANT[conversation.status] ?? 'neutral'} className="capitalize">
            {conversation.status.replace('_', ' ')}
          </Badge>
          {conversation.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${tag.color}1a`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
          {conversation.unreadCount > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-birvo-purple px-1.5 text-[10px] font-semibold text-white">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
