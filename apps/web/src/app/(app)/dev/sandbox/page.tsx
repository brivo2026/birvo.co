'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FlaskConical, ArrowRight } from 'lucide-react';
import type { ChannelAccountDto } from '@/types/api';

interface DemoContact {
  id: string;
  name: string;
  externalUserId?: string;
}

export default function DevSandboxPage() {
  const { data: contacts } = useQuery({
    queryKey: ['dev-sandbox', 'contacts'],
    queryFn: () => api.get<DemoContact[]>('/dev/sandbox/contacts'),
  });
  const { data: channels } = useQuery({ queryKey: ['channels'], queryFn: () => api.get<ChannelAccountDto[]>('/channels') });

  const sandboxChannel = channels?.find((c) => c.provider === 'sandbox');

  const [contactId, setContactId] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'audio' | 'image'>('text');
  const [text, setText] = useState('Hola, quiero saber más sobre BIRVO 👋');
  const [simulateDuplicate, setSimulateDuplicate] = useState(false);
  const [simulateError, setSimulateError] = useState(false);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [conversationId, setConversationId] = useState('');

  const simulateMutation = useMutation({
    mutationFn: () =>
      api.post('/dev/sandbox/simulate-inbound', {
        channelAccountId: sandboxChannel?.id,
        contactId: contactId || undefined,
        contactName: !contactId ? newContactName || 'Cliente de prueba' : undefined,
        messageType,
        text: messageType === 'text' ? text : undefined,
        simulateDuplicate,
        simulateTemporaryError: simulateError,
      }),
    onSuccess: (result) => setLastResult(result),
  });

  const triggerAiMutation = useMutation({
    mutationFn: () => api.post(`/dev/sandbox/conversations/${conversationId}/trigger-ai`),
  });

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mb-2 flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-amber-500" />
        <h1 className="font-heading text-2xl font-semibold text-slate-900">Sandbox de desarrollo</h1>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Simula mensajes entrantes a través del mismo flujo de webhook que usarían canales reales. Solo disponible en
        development.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-heading font-semibold text-slate-900">Simular mensaje entrante</h2>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Contacto existente</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
            >
              <option value="">— Crear contacto nuevo —</option>
              {contacts?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {!contactId && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Nombre del nuevo contacto</label>
              <Input value={newContactName} onChange={(e) => setNewContactName(e.target.value)} placeholder="Cliente de prueba" />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipo de mensaje</label>
            <div className="flex gap-2">
              {(['text', 'audio', 'image'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMessageType(t)}
                  className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${
                    messageType === t ? 'border-birvo-purple bg-birvo-purple/10 text-birvo-purple' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {t === 'text' ? 'Texto' : t === 'audio' ? 'Nota de voz' : 'Imagen'}
                </button>
              ))}
            </div>
          </div>

          {messageType === 'text' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Mensaje (como si fueras el cliente)</label>
              <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
            </div>
          )}

          <div className="flex flex-col gap-2 text-sm text-slate-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={simulateDuplicate} onChange={(e) => setSimulateDuplicate(e.target.checked)} />
              Simular mensaje duplicado (reenvía el mismo externalMessageId)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={simulateError} onChange={(e) => setSimulateError(e.target.checked)} />
              Simular error temporal (agota reintentos → dead-letter)
            </label>
          </div>

          <Button
            className="w-full"
            loading={simulateMutation.isPending}
            disabled={!sandboxChannel}
            onClick={() => simulateMutation.mutate()}
          >
            Enviar mensaje simulado
          </Button>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-heading font-semibold text-slate-900">Payload normalizado</h2>
          <pre className="max-h-80 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-300">
            {lastResult ? JSON.stringify(lastResult, null, 2) : 'Envía un mensaje simulado para ver el payload aquí.'}
          </pre>
          <Link href="/inbox" className="inline-flex items-center gap-1 text-sm font-medium text-birvo-purple hover:underline">
            Ver en la bandeja <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>

        <Card className="space-y-3 lg:col-span-2">
          <h2 className="font-heading font-semibold text-slate-900">Forzar evaluación de IA (sin esperar el temporizador)</h2>
          <p className="text-sm text-slate-500">
            Pega el ID de una conversación (puedes copiarlo desde la URL en /inbox/&lt;id&gt;) para forzar de
            inmediato la evaluación de sugerencia/respuesta automática, sin esperar los minutos de inactividad
            configurados en Configuración → IA.
          </p>
          <div className="flex gap-2">
            <Input placeholder="ID de conversación" value={conversationId} onChange={(e) => setConversationId(e.target.value)} />
            <Button
              variant="outline"
              disabled={!conversationId}
              loading={triggerAiMutation.isPending}
              onClick={() => triggerAiMutation.mutate()}
            >
              Forzar IA ahora
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
