'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/ui/spinner';

const steps = [
  'Tu organización fue creada correctamente.',
  'Ya tienes un canal sandbox activo para probar BIRVO sin credenciales externas.',
  'Invita a tu equipo desde Configuración → Equipo cuando quieras.',
  'Simula tu primera conversación desde /dev/sandbox.',
];

export default function OnboardingPage() {
  const { data, isLoading } = useCurrentUser();

  if (isLoading) return <FullPageSpinner />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-birvo-gray px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-birvo-purple/10">
          <CheckCircle2 className="h-7 w-7 text-birvo-purple" />
        </div>
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          ¡Bienvenido a BIRVO{data?.user ? `, ${data.user.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="mt-1 text-sm text-slate-500">Tus conversaciones. Un solo lugar.</p>

        <ul className="mt-6 space-y-3 text-left">
          {steps.map((step) => (
            <li key={step} className="flex items-start gap-2 text-sm text-slate-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {step}
            </li>
          ))}
        </ul>

        <Link href="/inbox">
          <Button className="mt-8 w-full" size="lg">
            Ir a mi bandeja
          </Button>
        </Link>
      </div>
    </main>
  );
}
