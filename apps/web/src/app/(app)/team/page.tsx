'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FullPageSpinner } from '@/components/ui/spinner';
import { UserPlus } from 'lucide-react';
import type { TeamMember } from '@/hooks/use-team-members';

interface RoleOption {
  id: string;
  name: string;
}

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [createdInfo, setCreatedInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => api.get<TeamMember[]>('/users'),
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<RoleOption[]>('/roles'),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post<{ email: string; temporaryPassword?: string }>('/users', { name, email, roleId }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setName('');
      setEmail('');
      setError(null);
      if (result.temporaryPassword) {
        setCreatedInfo(`Se creó ${result.email}. Contraseña temporal: ${result.temporaryPassword}`);
      } else {
        setCreatedInfo(`Se agregó ${result.email} a la organización.`);
      }
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : 'No se pudo agregar al usuario.'),
  });

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">Equipo</h1>
        <Button onClick={() => setShowForm((v) => !v)}>
          <UserPlus className="h-4 w-4" /> Agregar miembro
        </Button>
      </div>

      {showForm && (
        <Card className="mt-4 max-w-lg">
          <div className="space-y-3">
            <Input placeholder="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Correo electrónico" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              <option value="">Selecciona un rol</option>
              {roles?.map((r) => (
                <option key={r.id} value={r.id} className="capitalize">
                  {r.name}
                </option>
              ))}
            </select>
            {error && <p className="text-xs text-red-600">{error}</p>}
            {createdInfo && <p className="text-xs text-emerald-600">{createdInfo}</p>}
            <Button
              disabled={!name || !email || !roleId}
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Crear miembro
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <FullPageSpinner />
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Miembro</th>
                <th className="px-5 py-3 font-medium">Rol</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {members?.map((m) => (
                <tr key={m.membershipId} className="border-b border-slate-50 last:border-0">
                  <td className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={m.name} src={m.avatarUrl} size={32} />
                    <div>
                      <p className="font-medium text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-400">{m.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 capitalize text-slate-600">{m.role}</td>
                  <td className="px-5 py-3">
                    <Badge variant={m.status === 'active' ? 'success' : 'neutral'} className="capitalize">
                      {m.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
