import { Injectable } from '@nestjs/common';
import type {
  AssignConversationDto,
  ListConversationsQuery,
  SessionUser,
  UpdateAiModeDto,
  UpdateConversationPriorityDto,
  UpdateConversationStatusDto,
} from '@birvo/contracts';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimePublisherService } from '../../realtime/realtime-publisher.service';
import { QueueService } from '../../queue/queue.service';
import { ConversationLookupService } from './conversation-lookup.service';
import { ConversationsQueryService } from './conversations-query.service';
import { ConversationsMutationService } from './conversations-mutation.service';
import { ConversationNotesService } from './conversation-notes.service';

/**
 * Fachada del módulo de conversaciones: mantiene la API pública que ya consume
 * ConversationsController (y el test unitario, que instancia esta clase directamente
 * con `new`), delegando cada método a un servicio más pequeño y enfocado.
 */
@Injectable()
export class ConversationsService {
  private readonly lookup: ConversationLookupService;
  private readonly queryService: ConversationsQueryService;
  private readonly mutationService: ConversationsMutationService;
  private readonly notesService: ConversationNotesService;

  constructor(prisma: PrismaService, audit: AuditService, realtime: RealtimePublisherService, queue: QueueService) {
    this.lookup = new ConversationLookupService(prisma, realtime);
    this.queryService = new ConversationsQueryService(prisma, this.lookup);
    this.mutationService = new ConversationsMutationService(prisma, audit, realtime, queue, this.lookup);
    this.notesService = new ConversationNotesService(prisma, audit, realtime, this.lookup);
  }

  list(user: SessionUser, query: ListConversationsQuery) {
    return this.queryService.list(user, query);
  }

  getById(user: SessionUser, conversationPublicId: string) {
    return this.queryService.getById(user, conversationPublicId);
  }

  markAsRead(user: SessionUser, conversationPublicId: string) {
    return this.mutationService.markAsRead(user, conversationPublicId);
  }

  assign(user: SessionUser, conversationPublicId: string, dto: AssignConversationDto) {
    return this.mutationService.assign(user, conversationPublicId, dto);
  }

  updateStatus(user: SessionUser, conversationPublicId: string, dto: UpdateConversationStatusDto) {
    return this.mutationService.updateStatus(user, conversationPublicId, dto);
  }

  updatePriority(user: SessionUser, conversationPublicId: string, dto: UpdateConversationPriorityDto) {
    return this.mutationService.updatePriority(user, conversationPublicId, dto);
  }

  updateAiMode(user: SessionUser, conversationPublicId: string, dto: UpdateAiModeDto) {
    return this.mutationService.updateAiMode(user, conversationPublicId, dto);
  }

  addTag(user: SessionUser, conversationPublicId: string, tagPublicId: string) {
    return this.mutationService.addTag(user, conversationPublicId, tagPublicId);
  }

  removeTag(user: SessionUser, conversationPublicId: string, tagPublicId: string) {
    return this.mutationService.removeTag(user, conversationPublicId, tagPublicId);
  }

  listNotes(user: SessionUser, conversationPublicId: string) {
    return this.notesService.listNotes(user, conversationPublicId);
  }

  addNote(user: SessionUser, conversationPublicId: string, body: string) {
    return this.notesService.addNote(user, conversationPublicId, body);
  }
}
