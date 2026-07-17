'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FullPageSpinner } from '@/components/ui/spinner';
import type { ChannelAccountDto } from '@/types/api';

const PROVIDER_LABEL: Record<string, string> = {
  sandbox: 'Sandbox (desarrollo)',
  whatsapp: 'WhatsApp Cloud API',
  instagram: 'Instagram Messaging',
  messenger: 'Messenger',
};

export default function ChannelsSettingsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['channels'], queryFn: () => api.get<ChannelAccountDto[]>('/channels') });

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-3">
      {data?.map((channel) => (
        <Card key={channel.id} className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800">{channel.displayName}</p>
            <p className="text-xs text-slate-500">{PROVIDER_LABEL[channel.provider] ?? channel.provider}</p>
          </div>
          <Badge variant={channel.isEnabled ? 'success' : 'neutral'}>
            {channel.isEnabled ? 'Activo' : 'Requiere credenciales'}
          </Badge>
        </Card>
      ))}

      <Card className="border-dashed bg-birvo-gray/50">
        <p className="text-sm text-slate-600">
          WhatsApp, Instagram y Messenger usan la Meta Graph API y requieren credenciales reales
          (<code className="rounded bg-slate-100 px-1">META_APP_SECRET</code>,{' '}
          <code className="rounded bg-slate-100 px-1">WHATSAPP_CLOUD_API_TOKEN</code>, etc. en tu archivo{' '}
          <code className="rounded bg-slate-100 px-1">.env</code>). El adaptador ya está implementado y listo — ver{' '}
          <code className="rounded bg-slate-100 px-1">packages/channel-sdk</code>.
        </p>
      </Card>
    </div>
  );
}
