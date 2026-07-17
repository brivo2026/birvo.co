'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { FullPageSpinner } from '@/components/ui/spinner';
import type { PaginatedResponse } from '@/types/api';

interface ContactListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  conversationsCount?: number;
  updatedAt: string;
}

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: () => api.get<PaginatedResponse<ContactListItem>>(`/contacts?search=${encodeURIComponent(search)}`),
  });

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">Contactos</h1>
      </div>

      <div className="relative mt-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por nombre, correo o teléfono…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : data?.items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-2 text-center text-slate-400">
          <Users className="h-10 w-10" strokeWidth={1.3} />
          <p className="text-sm">No hay contactos todavía.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Contacto</th>
                <th className="px-5 py-3 font-medium">Teléfono</th>
                <th className="px-5 py-3 font-medium">Correo</th>
                <th className="px-5 py-3 font-medium">Conversaciones</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((contact) => (
                <tr key={contact.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/contacts/${contact.id}`} className="flex items-center gap-3">
                      <Avatar name={contact.name} src={contact.avatarUrl} size={32} />
                      <span className="font-medium text-slate-800">{contact.name}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{contact.phone ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{contact.email ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{contact.conversationsCount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
