'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/ui/spinner';
import { Inbox, Users, Sparkles, ArrowRight } from 'lucide-react';

interface AnalyticsOverview {
  conversationsReceived: number;
  conversationsOpen: number;
  conversationsClosed: number;
  aiRepliedPercentage: number;
}

export default function DashboardPage() {
  const { data: userData } = useCurrentUser();
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'overview', 'dashboard'],
    queryFn: () => api.get<AnalyticsOverview>('/analytics/overview'),
  });

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <h1 className="font-heading text-2xl font-semibold text-slate-900">
        Hola, {userData?.user.name.split(' ')[0]} 👋
      </h1>
      <p className="mt-1 text-slate-500">Esto es lo que está pasando en {userData?.user.organizationName} hoy.</p>

      {isLoading ? (
        <FullPageSpinner />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-sm text-slate-500">Conversaciones recibidas (30d)</p>
            <p className="mt-2 font-heading text-3xl font-semibold text-slate-900">{data?.conversationsReceived ?? 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Abiertas ahora</p>
            <p className="mt-2 font-heading text-3xl font-semibold text-birvo-purple">{data?.conversationsOpen ?? 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Cerradas (30d)</p>
            <p className="mt-2 font-heading text-3xl font-semibold text-emerald-600">{data?.conversationsClosed ?? 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Respondido por IA</p>
            <p className="mt-2 font-heading text-3xl font-semibold text-birvo-blue">{data?.aiRepliedPercentage ?? 0}%</p>
          </Card>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex flex-col gap-3">
          <Inbox className="h-6 w-6 text-birvo-purple" />
          <h3 className="font-heading font-semibold">Ir a la bandeja</h3>
          <p className="text-sm text-slate-500">Responde a tus clientes en tiempo real.</p>
          <Link href="/inbox">
            <Button variant="outline" size="sm" className="mt-auto">
              Abrir bandeja <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Card>
        <Card className="flex flex-col gap-3">
          <Users className="h-6 w-6 text-birvo-blue" />
          <h3 className="font-heading font-semibold">Invita a tu equipo</h3>
          <p className="text-sm text-slate-500">Agrega agentes y define sus roles.</p>
          <Link href="/team">
            <Button variant="outline" size="sm" className="mt-auto">
              Ir a Equipo <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Card>
        <Card className="flex flex-col gap-3">
          <Sparkles className="h-6 w-6 text-amber-500" />
          <h3 className="font-heading font-semibold">Configura la IA</h3>
          <p className="text-sm text-slate-500">Define cuándo debe intervenir la IA.</p>
          <Link href="/settings/ai">
            <Button variant="outline" size="sm" className="mt-auto">
              Configurar IA <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
