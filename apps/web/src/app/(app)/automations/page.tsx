'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FullPageSpinner } from '@/components/ui/spinner';
import { formatRelativeTime } from '@/lib/utils';
import { Zap } from 'lucide-react';
import type { PaginatedResponse } from '@/types/api';

interface AutomationRunItem {
  id: string;
  status: string;
  contactName: string;
  conversationId: string;
  result: unknown;
  createdAt: string;
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
  scheduled: 'warning',
  running: 'warning',
  completed: 'success',
  cancelled: 'neutral',
  failed: 'danger',
};

export default function AutomationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['automation-runs'],
    queryFn: () => api.get<PaginatedResponse<AutomationRunItem>>('/automation-runs'),
  });

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <h1 className="font-heading text-2xl font-semibold text-slate-900">Automatizaciones</h1>
      <p className="mt-1 text-sm text-slate-500">
        La automatización principal de BIRVO es el temporizador de inactividad con IA. Configúralo desde{' '}
        <Link href="/settings/ai" className="font-medium text-birvo-purple hover:underline">
          Configuración → IA
        </Link>
        .
      </p>

      <h2 className="mt-8 mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-slate-400">
        Historial de ejecuciones
      </h2>

      {isLoading ? (
        <FullPageSpinner />
      ) : data?.items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center text-slate-400">
          <Zap className="h-8 w-8" strokeWidth={1.3} />
          <p className="text-sm">Aún no se ha programado ninguna automatización.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {data?.items.map((run) => (
            <Link
              key={run.id}
              href={`/inbox/${run.conversationId}`}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{run.contactName}</p>
                <p className="text-xs text-slate-400">Temporizador de inactividad → evaluación de IA</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={STATUS_VARIANT[run.status] ?? 'neutral'} className="capitalize">
                  {run.status}
                </Badge>
                <span className="text-xs text-slate-400">{formatRelativeTime(run.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
