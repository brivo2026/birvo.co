'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FullPageSpinner } from '@/components/ui/spinner';
import { formatRelativeTime } from '@/lib/utils';
import type { ContactDetail } from '@/types/api';

export default function ContactDetailPage() {
  const { contactId } = useParams<{ contactId: string }>();
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => api.get<ContactDetail>(`/contacts/${contactId}`),
  });

  if (isLoading) return <FullPageSpinner />;
  if (isError || !data) {
    return <div className="p-8 text-sm text-red-600">No se pudo cargar este contacto.</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center text-center lg:col-span-1">
          <Avatar name={data.name} src={data.avatarUrl} size={72} />
          <h1 className="mt-3 font-heading text-xl font-semibold text-slate-900">{data.name}</h1>
          <p className="text-sm text-slate-500">{data.phone ?? 'Sin teléfono'}</p>
          <p className="text-sm text-slate-500">{data.email ?? 'Sin correo'}</p>

          <div className="mt-4 w-full text-left">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Canales</h3>
            <div className="flex flex-wrap gap-1.5">
              {data.identities.map((identity, idx) => (
                <Badge key={idx} variant="blue">
                  {identity.channel}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-heading font-semibold text-slate-900">Conversaciones recientes</h3>
          <div className="space-y-2">
            {data.recentConversations.map((c) => (
              <Link
                key={c.id}
                href={`/inbox/${c.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 hover:bg-slate-50"
              >
                <span className="text-sm capitalize text-slate-700">{c.status.replace('_', ' ')}</span>
                <span className="text-xs text-slate-400">{formatRelativeTime(c.lastMessageAt)}</span>
              </Link>
            ))}
            {data.recentConversations.length === 0 && (
              <p className="text-sm text-slate-400">Sin conversaciones todavía.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
