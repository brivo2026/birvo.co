'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loginSchema, type LoginDto } from '@birvo/contracts';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: (data: LoginDto) => api.post('/auth/login', data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      router.push('/inbox');
    },
    onError: (error: unknown) => {
      setServerError(error instanceof ApiError ? error.message : 'No se pudo iniciar sesión.');
    },
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-slate-900">Inicia sesión</h1>
      <p className="mt-1 text-sm text-slate-500">Accede a la bandeja unificada de tu equipo.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Correo electrónico</label>
          <Input type="email" placeholder="tú@empresa.com" {...register('email')} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
          <Input type="password" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}

        <Button type="submit" className="w-full" loading={mutation.isPending}>
          Entrar
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="font-medium text-birvo-purple hover:underline">
          Regístrate
        </Link>
      </p>

      <div className="mt-6 rounded-xl bg-birvo-gray p-4 text-xs text-slate-500">
        <p className="mb-1 font-semibold text-slate-600">Credenciales demo (solo desarrollo):</p>
        <p>owner@birvo.local · admin@birvo.local · agent@birvo.local</p>
        <p>Contraseña: Birvo#Dev2026</p>
      </div>
    </div>
  );
}
