'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { FullPageSpinner } from '@/components/ui/spinner';

interface AnalyticsOverview {
  conversationsReceived: number;
  conversationsOpen: number;
  conversationsClosed: number;
  avgFirstResponseSeconds: number | null;
  avgResolutionSeconds: number | null;
  messagesByChannel: Record<string, number>;
  conversationsByAgent: Array<{ agentId: string | null; agentName: string; conversations: number }>;
  aiRepliedPercentage: number;
  transferredToHumanPercentage: number;
  simulatedSatisfaction: number | null;
  busiestHours: Array<{ hour: number; count: number }>;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${(minutes / 60).toFixed(1)} h`;
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'overview', 'full'],
    queryFn: () => api.get<AnalyticsOverview>('/analytics/overview'),
  });

  if (isLoading || !data) return <FullPageSpinner />;

  const maxHourCount = Math.max(1, ...data.busiestHours.map((h) => h.count));

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <h1 className="font-heading text-2xl font-semibold text-slate-900">Analítica</h1>
      <p className="mt-1 text-sm text-slate-500">Últimos 30 días.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Recibidas" value={data.conversationsReceived} />
        <Metric label="Abiertas" value={data.conversationsOpen} accent="text-birvo-purple" />
        <Metric label="Cerradas" value={data.conversationsClosed} accent="text-emerald-600" />
        <Metric label="Satisfacción (simulada)" value={data.simulatedSatisfaction ? `${data.simulatedSatisfaction}%` : '—'} />
        <Metric label="1ª respuesta (prom.)" value={formatDuration(data.avgFirstResponseSeconds)} />
        <Metric label="Resolución (prom.)" value={formatDuration(data.avgResolutionSeconds)} />
        <Metric label="Respondido por IA" value={`${data.aiRepliedPercentage}%`} accent="text-birvo-blue" />
        <Metric label="Transferido a humano" value={`${data.transferredToHumanPercentage}%`} accent="text-amber-600" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-heading font-semibold text-slate-900">Mensajes por canal</h3>
          <div className="space-y-3">
            {Object.entries(data.messagesByChannel).map(([channel, count]) => (
              <div key={channel} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm capitalize text-slate-600">{channel}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-birvo-purple"
                    style={{ width: `${Math.min(100, (count / Math.max(1, data.conversationsReceived)) * 100)}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm text-slate-500">{count}</span>
              </div>
            ))}
            {Object.keys(data.messagesByChannel).length === 0 && (
              <p className="text-sm text-slate-400">Sin datos todavía.</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-heading font-semibold text-slate-900">Conversaciones por agente</h3>
          <div className="space-y-3">
            {data.conversationsByAgent.map((agent) => (
              <div key={agent.agentId ?? 'sin-asignar'} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{agent.agentName}</span>
                <span className="font-medium text-slate-800">{agent.conversations}</span>
              </div>
            ))}
            {data.conversationsByAgent.length === 0 && <p className="text-sm text-slate-400">Sin datos todavía.</p>}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-heading font-semibold text-slate-900">Horarios con mayor volumen</h3>
          <div className="flex items-end gap-1.5" style={{ height: 120 }}>
            {Array.from({ length: 24 }, (_, hour) => {
              const entry = data.busiestHours.find((h) => h.hour === hour);
              const count = entry?.count ?? 0;
              return (
                <div key={hour} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-sm bg-birvo-blue/70"
                    style={{ height: `${(count / maxHourCount) * 100}px` }}
                    title={`${hour}:00 — ${count} mensajes`}
                  />
                  {hour % 4 === 0 && <span className="text-[9px] text-slate-400">{hour}h</span>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <Card>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 font-heading text-2xl font-semibold text-slate-900 ${accent ?? ''}`}>{value}</p>
    </Card>
  );
}
