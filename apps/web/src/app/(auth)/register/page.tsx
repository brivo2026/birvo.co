'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registerOrganizationSchema, type RegisterOrganizationDto } from '@birvo/contracts';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterOrganizationDto>({
    resolver: zodResolver(registerOrganizationSchema),
    defaultValues: { timezone: 'America/Bogota' },
  });

  const mutation = useMutation({
    mutationFn: (data: RegisterOrganizationDto) => api.post('/auth/register', data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      router.push('/onboarding');
    },
    onError: (error: unknown) => {
      setServerError(error instanceof ApiError ? error.message : 'No se pudo completar el registro.');
    },
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-slate-900">Crea tu organización</h1>
      <p className="mt-1 text-sm text-slate-500">Empieza gratis, sin necesidad de credenciales externas.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Nombre de tu negocio</label>
          <Input placeholder="Mi Negocio S.A.S." {...register('organizationName')} />
          {errors.organizationName && <p className="mt-1 text-xs text-red-600">{errors.organizationName.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Tu nombre</label>
          <Input placeholder="Nombre completo" {...register('ownerName')} />
          {errors.ownerName && <p className="mt-1 text-xs text-red-600">{errors.ownerName.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Correo electrónico</label>
          <Input type="email" placeholder="tú@empresa.com" {...register('ownerEmail')} />
          {errors.ownerEmail && <p className="mt-1 text-xs text-red-600">{errors.ownerEmail.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
          <Input type="password" placeholder="Mínimo 8 caracteres" {...register('password')} />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}

        <Button type="submit" className="w-full" loading={mutation.isPending}>
          Crear cuenta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-birvo-purple hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
