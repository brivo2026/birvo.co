import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { MessageSquare, Zap, Users, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-birvo-gray">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-heading text-xl font-semibold text-birvo-blue">BIRVO</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost">Iniciar sesión</Button>
          </Link>
          <Link href="/register">
            <Button>Crear cuenta gratis</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center">
        <span className="mb-4 rounded-full bg-birvo-purple/10 px-4 py-1.5 text-sm font-medium text-birvo-purple">
          Bandeja omnicanal para negocios
        </span>
        <h1 className="font-heading text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
          Tus conversaciones.
          <br />
          <span className="text-birvo-purple">Un solo lugar.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-slate-600">
          BIRVO centraliza WhatsApp, Instagram y Messenger en una sola bandeja, para que tu
          equipo responda más rápido y nunca pierda una conversación.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/register">
            <Button size="lg">Empezar ahora</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Ya tengo cuenta
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: MessageSquare, title: 'Bandeja unificada', desc: 'Todos tus canales en un solo lugar.' },
          { icon: Users, title: 'Trabajo en equipo', desc: 'Asigna y colabora en cada conversación.' },
          { icon: Sparkles, title: 'IA como respaldo', desc: 'Sugerencias y respuestas automáticas cuando lo necesites.' },
          { icon: Zap, title: 'Tiempo real', desc: 'Todo se actualiza al instante, sin recargar.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
            <Icon className="mb-3 h-6 w-6 text-birvo-purple" strokeWidth={1.5} />
            <h3 className="font-heading font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
