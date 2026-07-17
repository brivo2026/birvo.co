'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AiConfigurationDto } from '@birvo/contracts';

export default function AiSettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['ai-configuration'],
    queryFn: () => api.get<AiConfigurationDto & { id: string }>('/ai/configuration'),
  });

  const [form, setForm] = useState<Partial<AiConfigurationDto>>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => api.patch('/ai/configuration', form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-configuration'] }),
  });

  if (!data) return null;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-semibold text-slate-900">Asistencia de IA</h2>
            <p className="text-sm text-slate-500">
              Modelo operativo: humano primero, la IA solo actúa como respaldo.
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={form.aiEnabled ?? false}
              onChange={(e) => setForm((f) => ({ ...f, aiEnabled: e.target.checked }))}
            />
            <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-birvo-purple after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
          </label>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Tiempo máximo de espera antes de intervenir (minutos)
          </label>
          <Input
            type="number"
            min={1}
            value={form.inactivityMinutes ?? 5}
            onChange={(e) => setForm((f) => ({ ...f, inactivityMinutes: Number(e.target.value) }))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Modo</label>
          <div className="flex gap-2">
            {(['suggestion', 'automatic'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setForm((f) => ({ ...f, mode }))}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium ${
                  form.mode === mode ? 'border-birvo-purple bg-birvo-purple/10 text-birvo-purple' : 'border-slate-200 text-slate-600'
                }`}
              >
                {mode === 'suggestion' ? 'Sugerencia (recomendado)' : 'Respuesta automática'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Horario laboral desde</label>
            <Input
              type="time"
              value={form.businessHoursStart ?? '08:00'}
              onChange={(e) => setForm((f) => ({ ...f, businessHoursStart: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">hasta</label>
            <Input
              type="time"
              value={form.businessHoursEnd ?? '18:00'}
              onChange={(e) => setForm((f) => ({ ...f, businessHoursEnd: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Máximo de respuestas automáticas por conversación</label>
          <Input
            type="number"
            min={0}
            value={form.maximumAutomaticReplies ?? 3}
            onChange={(e) => setForm((f) => ({ ...f, maximumAutomaticReplies: Number(e.target.value) }))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Umbral de confianza (0 a 1)</label>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={form.confidenceThreshold ?? 0.7}
            onChange={(e) => setForm((f) => ({ ...f, confidenceThreshold: Number(e.target.value) }))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Palabras de escalamiento (separadas por coma)
          </label>
          <Input
            value={(form.escalationKeywords ?? []).join(', ')}
            onChange={(e) => setForm((f) => ({ ...f, escalationKeywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Temas excluidos de automatización (separados por coma)
          </label>
          <Input
            value={(form.excludedTopics ?? []).join(', ')}
            onChange={(e) => setForm((f) => ({ ...f, excludedTopics: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
          />
        </div>

        <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
          Guardar configuración de IA
        </Button>
      </Card>
    </div>
  );
}
