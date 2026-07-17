'use client';

import { useRealtimeConnection } from '@/hooks/use-realtime-connection';
import { cn } from '@/lib/utils';

const LABELS: Record<string, string> = {
  connected: 'En tiempo real',
  connecting: 'Conectando…',
  reconnecting: 'Reconectando…',
  disconnected: 'Sin conexión',
};

export function ConnectionBadge() {
  const status = useRealtimeConnection();

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          status === 'connected' && 'bg-emerald-500',
          status === 'connecting' && 'bg-amber-400 animate-pulse',
          status === 'reconnecting' && 'bg-amber-500 animate-pulse',
          status === 'disconnected' && 'bg-red-500',
        )}
      />
      {LABELS[status]}
    </div>
  );
}
