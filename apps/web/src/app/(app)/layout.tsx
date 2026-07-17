'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Sidebar } from '@/components/layout/sidebar';
import { FullPageSpinner } from '@/components/ui/spinner';
import { useUiStore } from '@/store/ui-store';
import { Logo } from '@/components/ui/logo';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useCurrentUser();
  const router = useRouter();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  useEffect(() => {
    if (!isLoading && (isError || !data?.user)) {
      router.replace('/login');
    }
  }, [isLoading, isError, data, router]);

  if (isLoading) return <FullPageSpinner />;
  if (!data?.user) return <FullPageSpinner />;

  return (
    <div className="flex h-screen overflow-hidden bg-birvo-gray">
      <Sidebar user={data.user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 md:hidden">
          <button
            onClick={toggleSidebar}
            aria-label="Abrir menú"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Logo />
          <span className="font-heading text-base font-semibold text-birvo-blue">BIRVO</span>
        </div>
        {children}
      </div>
    </div>
  );
}
