import type { Job } from 'bullmq';
import { SocketEvent, conversationRoom, type TranscribeAttachmentJob } from '@birvo/contracts';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { aiProvider } from '../lib/ai-provider';
import { publishRealtimeEvent } from '../lib/realtime-publisher';

/**
 * Procesa la transcripción de una nota de voz. En el MVP usa
 * `aiProvider.transcribeAudio()` (MockAiProvider implementa
 * TranscriptionProvider como parte de AiProvider para evitar duplicar
 * interfaces muy similares — ver packages/ai-sdk). Un proveedor de
 * transcripción real e independiente puede sustituirse implementando la
 * misma interfaz sin tocar este procesador.
 */
export async function transcribeAttachment(job: Job<TranscribeAttachmentJob>): Promise<void> {
  const attachment = await prisma.attachment.findUnique({
    where: { id: job.data.attachmentId },
    include: { message: { include: { conversation: true } } },
  });
  if (!attachment) {
    logger.warn({ attachmentId: job.data.attachmentId }, 'Adjunto no encontrado, se ignora el job de transcripción');
    return;
  }
  if (attachment.transcriptionStatus === 'completed') return;

  await prisma.attachment.update({
    where: { id: attachment.id },
    data: { transcriptionStatus: 'processing', transcriptionAttempts: { increment: 1 } },
  });

  try {
    const result = await aiProvider.transcribeAudio({
      audioBuffer: Buffer.from('sandbox-audio-placeholder'),
      mimeType: attachment.mimeType,
    });

    await prisma.attachment.update({
      where: { id: attachment.id },
      data: {
        transcriptionStatus: 'completed',
        transcriptionText: result.text,
        transcriptionLang: result.language,
        transcriptionProvider: result.provider,
        duration: attachment.duration ?? Math.round(result.durationSeconds),
      },
    });

    await publishRealtimeEvent(
      SocketEvent.MESSAGE_TRANSCRIPTION_UPDATED,
      conversationRoom(attachment.message.conversation.publicId),
      { attachmentId: attachment.publicId, messageId: attachment.message.publicId, status: 'completed', text: result.text },
    );
  } catch (error) {
    await prisma.attachment.update({ where: { id: attachment.id }, data: { transcriptionStatus: 'failed' } });
    await publishRealtimeEvent(
      SocketEvent.MESSAGE_TRANSCRIPTION_UPDATED,
      conversationRoom(attachment.message.conversation.publicId),
      { attachmentId: attachment.publicId, messageId: attachment.message.publicId, status: 'failed' },
    );
    throw error;
  }
}
