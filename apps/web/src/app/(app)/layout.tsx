'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Sidebar } from '@/components/layout/sidebar';
import { FullPageSpinner } from '@/components/ui/spinner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useCurrentUser();
  const router = useRouter();

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
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
