'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  status: string;
  timezone: string;
}

export default function GeneralSettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['organization'], queryFn: () => api.get<OrganizationDto>('/organization') });
  const [name, setName] = useState('');

  useEffect(() => {
    if (data) setName(data.name);
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => api.patch('/organization', { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization'] }),
  });

  return (
    <Card>
      <h2 className="mb-4 font-heading font-semibold text-slate-900">Datos de la organización</h2>
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Nombre</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Slug</label>
          <Input value={data?.slug ?? ''} disabled />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Zona horaria</label>
          <Input value={data?.timezone ?? ''} disabled />
        </div>
        <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
          Guardar cambios
        </Button>
      </div>
    </Card>
  );
}
