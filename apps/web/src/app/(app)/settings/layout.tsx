'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/settings', label: 'General' },
  { href: '/settings/channels', label: 'Canales' },
  { href: '/settings/ai', label: 'Inteligencia Artificial' },
  { href: '/settings/security', label: 'Seguridad' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <h1 className="font-heading text-2xl font-semibold text-slate-900">Configuración</h1>
      <div className="mt-4 flex gap-1 border-b border-slate-100">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'border-b-2 px-4 py-2.5 text-sm font-medium',
              pathname === tab.href ? 'border-birvo-purple text-birvo-purple' : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <div className="mt-6 max-w-2xl">{children}</div>
    </div>
  );
}
