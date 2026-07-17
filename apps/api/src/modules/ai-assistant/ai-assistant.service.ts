import { Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser, UpdateAiConfigurationDto } from '@birvo/contracts';
import { PrismaService } from '../../database/prisma.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class AiAssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messagesService: MessagesService,
  ) {}

  async getConfiguration(organizationId: string) {
    const config = await this.prisma.client.aiConfiguration.findUnique({ where: { organizationId } });
    if (!config) throw new NotFoundException('Configuración de IA no encontrada.');
    return config;
  }

  async updateConfiguration(organizationId: string, dto: UpdateAiConfigurationDto) {
    const updated = await this.prisma.client.aiConfiguration.update({
      where: { organizationId },
      data: dto,
    });
    return updated;
  }

  async listExecutions(user: SessionUser, conversationPublicId: string) {
    const conversation = await this.prisma.client.conversation.findFirst({
      where: { publicId: conversationPublicId, organizationId: user.organizationId },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada.');

    const executions = await this.prisma.client.aiExecution.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return executions.map((e) => ({
      id: e.publicId,
      provider: e.provider,
      model: e.model,
      promptVersion: e.promptVersion,
      output: e.output,
      result: e.result,
      safetyFlags: e.safetyFlags,
      latencyMs: e.latencyMs,
      tokensUsed: e.tokensUsed,
      createdAt: e.createdAt,
    }));
  }

  /** El agente acepta una sugerencia de IA: se envía como si el propio agente la hubiera escrito. */
  async acceptSuggestion(user: SessionUser, conversationPublicId: string, aiExecutionPublicId: string) {
    const execution = await this.prisma.client.aiExecution.findFirst({
      where: { publicId: aiExecutionPublicId, conversation: { publicId: conversationPublicId, organizationId: user.organizationId } },
    });
    if (!execution || execution.result !== 'suggested') {
      throw new NotFoundException('Sugerencia de IA no encontrada.');
    }
    const output = execution.output as { text?: string } | null;
    if (!output?.text) throw new NotFoundException('La sugerencia no tiene contenido.');

    return this.messagesService.send(user, conversationPublicId, { messageType: 'text', content: output.text });
  }
}
