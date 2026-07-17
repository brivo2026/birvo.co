'use client';

import { useEffect, useRef } from 'react';
import { useMessages } from '@/hooks/use-messages';
import { MessageBubble } from './message-bubble';
import { Spinner } from '@/components/ui/spinner';
import { MessageSquareOff } from 'lucide-react';

export function MessageList({ conversationId }: { conversationId: string }) {
  const { data, isLoading, isError } = useMessages(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.items.length]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-400">
        <MessageSquareOff className="h-8 w-8" />
        <p className="text-sm">No se pudieron cargar los mensajes.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" data-testid="message-thread">
      {data?.items.length === 0 && (
        <p className="mt-10 text-center text-sm text-slate-400">Aún no hay mensajes en esta conversación.</p>
      )}
      {data?.items.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
