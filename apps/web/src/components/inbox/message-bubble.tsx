'use client';

import { Check, CheckCheck, Clock, AlertTriangle, Mic, Image as ImageIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageDto } from '@/types/api';

function StatusIcon({ status }: { status: string }) {
  if (status === 'failed') return <AlertTriangle className="h-3 w-3 text-red-300" />;
  if (status === 'read') return <CheckCheck className="h-3 w-3 text-sky-300" />;
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 text-white/70" />;
  if (status === 'sent') return <Check className="h-3 w-3 text-white/70" />;
  return <Clock className="h-3 w-3 text-white/50" />;
}

export function MessageBubble({ message }: { message: MessageDto }) {
  const isOutbound = message.direction === 'outbound';
  const isAi = message.senderType === 'ai';
  const isSystem = message.senderType === 'system';

  if (isSystem) {
    return <div className="my-2 text-center text-xs text-slate-400">{message.content}</div>;
  }

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-soft',
          isOutbound
            ? isAi
              ? 'bg-birvo-blue text-white rounded-br-sm'
              : 'bg-birvo-purple text-white rounded-br-sm'
            : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100',
        )}
      >
        {isAi && <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/70">Respuesta de IA</p>}

        {message.messageType === 'audio' && (
          <div className="mb-1.5 flex items-center gap-2 text-xs opacity-80">
            <Mic className="h-3.5 w-3.5" /> Nota de voz
          </div>
        )}
        {message.messageType === 'image' && (
          <div className="mb-1.5 flex items-center gap-2 text-xs opacity-80">
            <ImageIcon className="h-3.5 w-3.5" /> Imagen
          </div>
        )}
        {message.messageType === 'file' && (
          <div className="mb-1.5 flex items-center gap-2 text-xs opacity-80">
            <FileText className="h-3.5 w-3.5" /> Archivo
          </div>
        )}

        <p className="whitespace-pre-wrap break-words">{message.content}</p>

        {message.attachments.map((attachment) => (
          <div key={attachment.id} className="mt-2 rounded-lg bg-black/5 p-2 text-xs">
            {attachment.transcriptionStatus === 'pending' || attachment.transcriptionStatus === 'processing' ? (
              <p className="italic opacity-70">Transcribiendo…</p>
            ) : attachment.transcriptionStatus === 'completed' ? (
              <p className="opacity-90">📝 “{attachment.transcriptionText}”</p>
            ) : attachment.transcriptionStatus === 'failed' ? (
              <p className="text-red-200">No se pudo transcribir.</p>
            ) : null}
          </div>
        ))}

        <div className={cn('mt-1 flex items-center gap-1 text-[10px]', isOutbound ? 'justify-end text-white/70' : 'text-slate-400')}>
          {new Date(message.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          {isOutbound && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}
