'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function SecuritySettingsPage() {
  const router = useRouter();

  const revokeMutation = useMutation({
    mutationFn: () => api.post('/auth/logout-all-sessions'),
    onSuccess: () => router.push('/login'),
  });

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-heading font-semibold text-slate-900">Sesiones</h2>
        <p className="mt-1 text-sm text-slate-500">
          Las sesiones de BIRVO se guardan en una cookie httpOnly firmada (no accesible desde JavaScript) para
          proteger tu cuenta frente a ataques XSS.
        </p>
        <Button variant="destructive" className="mt-4" loading={revokeMutation.isPending} onClick={() => revokeMutation.mutate()}>
          Cerrar sesión en todos los dispositivos
        </Button>
      </Card>

      <Card className="flex gap-3 border-amber-200 bg-amber-50">
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">
          BIRVO aplica límite de intentos de inicio de sesión, bloqueo temporal tras intentos fallidos, cifrado de
          credenciales de canal y validación estricta de cada solicitud. Ver <code>docs/adr</code> para el detalle
          completo de las decisiones de seguridad.
        </p>
      </Card>
    </div>
  );
}
