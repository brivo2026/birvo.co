'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  Users,
  Zap,
  BarChart3,
  UsersRound,
  Settings,
  FlaskConical,
  LogOut,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { SessionUser } from '@birvo/contracts';
import { Avatar } from '@/components/ui/avatar';
import { Logo } from '@/components/ui/logo';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/inbox', label: 'Bandeja', icon: Inbox },
  { href: '/contacts', label: 'Contactos', icon: Users },
  { href: '/automations', label: 'Automatizaciones', icon: Zap },
  { href: '/analytics', label: 'Analítica', icon: BarChart3 },
  { href: '/team', label: 'Equipo', icon: UsersRound },
  { href: '/settings', label: 'Configuración', icon: Settings },
];

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    },
  });

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-100 bg-white">
      <div className="flex items-center gap-2 px-6 py-6">
        <Logo />
        <span className="font-heading text-xl font-semibold text-birvo-blue">BIRVO</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-birvo-purple/10 text-birvo-purple' : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}

        {process.env.NODE_ENV !== 'production' && (
          <Link
            href="/dev/sandbox"
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              pathname?.startsWith('/dev/sandbox')
                ? 'bg-amber-100 text-amber-700'
                : 'text-amber-600 hover:bg-amber-50',
            )}
          >
            <FlaskConical className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Sandbox (dev)
          </Link>
        )}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={user.name} src={user.avatarUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
            <p className="truncate text-xs capitalize text-slate-500">{user.roleName}</p>
          </div>
          <button
            onClick={() => logoutMutation.mutate()}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
