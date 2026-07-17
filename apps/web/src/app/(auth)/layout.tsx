import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-birvo-gray px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <Logo />
          <span className="font-heading text-xl font-semibold text-birvo-blue">BIRVO</span>
        </Link>
        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-card">{children}</div>
      </div>
    </main>
  );
}
