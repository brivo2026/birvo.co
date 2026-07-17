import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  addConversationTagSchema,
  assignConversationSchema,
  createInternalNoteSchema,
  listConversationsQuerySchema,
  updateAiModeSchema,
  updateConversationPrioritySchema,
  updateConversationStatusSchema,
  type AddConversationTagDto,
  type AssignConversationDto,
  type CreateInternalNoteDto,
  type ListConversationsQuery,
  type SessionUser,
  type UpdateAiModeDto,
  type UpdateConversationPriorityDto,
  type UpdateConversationStatusDto,
} from '@birvo/contracts';
import { ConversationsService } from './conversations.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../auth/dto/zod-dto';

@ApiTags('conversations')
@Controller({ path: 'conversations', version: '1' })
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(listConversationsQuerySchema)) query: ListConversationsQuery,
  ) {
    return this.conversationsService.list(user, query);
  }

  @Get(':conversationId')
  getById(@CurrentUser() user: SessionUser, @Param('conversationId') conversationId: string) {
    return this.conversationsService.getById(user, conversationId);
  }

  @Post(':conversationId/read')
  markAsRead(@CurrentUser() user: SessionUser, @Param('conversationId') conversationId: string) {
    return this.conversationsService.markAsRead(user, conversationId);
  }

  @Patch(':conversationId/assign')
  @RequirePermissions('conversations:assign')
  assign(
    @CurrentUser() user: SessionUser,
    @Param('conversationId') conversationId: string,
    @Body(new ZodValidationPipe(assignConversationSchema)) dto: AssignConversationDto,
  ) {
    return this.conversationsService.assign(user, conversationId, dto);
  }

  @Patch(':conversationId/status')
  @RequirePermissions('conversations:close')
  updateStatus(
    @CurrentUser() user: SessionUser,
    @Param('conversationId') conversationId: string,
    @Body(new ZodValidationPipe(updateConversationStatusSchema)) dto: UpdateConversationStatusDto,
  ) {
    return this.conversationsService.updateStatus(user, conversationId, dto);
  }

  @Patch(':conversationId/priority')
  updatePriority(
    @CurrentUser() user: SessionUser,
    @Param('conversationId') conversationId: string,
    @Body(new ZodValidationPipe(updateConversationPrioritySchema)) dto: UpdateConversationPriorityDto,
  ) {
    return this.conversationsService.updatePriority(user, conversationId, dto);
  }

  @Patch(':conversationId/ai-mode')
  @RequirePermissions('ai:configure')
  updateAiMode(
    @CurrentUser() user: SessionUser,
    @Param('conversationId') conversationId: string,
    @Body(new ZodValidationPipe(updateAiModeSchema)) dto: UpdateAiModeDto,
  ) {
    return this.conversationsService.updateAiMode(user, conversationId, dto);
  }

  @Post(':conversationId/tags')
  @RequirePermissions('tags:manage')
  addTag(
    @CurrentUser() user: SessionUser,
    @Param('conversationId') conversationId: string,
    @Body(new ZodValidationPipe(addConversationTagSchema)) dto: AddConversationTagDto,
  ) {
    return this.conversationsService.addTag(user, conversationId, dto.tagId);
  }

  @Delete(':conversationId/tags/:tagId')
  @RequirePermissions('tags:manage')
  removeTag(
    @CurrentUser() user: SessionUser,
    @Param('conversationId') conversationId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.conversationsService.removeTag(user, conversationId, tagId);
  }

  @Get(':conversationId/notes')
  @RequirePermissions('notes:manage')
  listNotes(@CurrentUser() user: SessionUser, @Param('conversationId') conversationId: string) {
    return this.conversationsService.listNotes(user, conversationId);
  }

  @Post(':conversationId/notes')
  @RequirePermissions('notes:manage')
  addNote(
    @CurrentUser() user: SessionUser,
    @Param('conversationId') conversationId: string,
    @Body(new ZodValidationPipe(createInternalNoteSchema)) dto: CreateInternalNoteDto,
  ) {
    return this.conversationsService.addNote(user, conversationId, dto.body);
  }
}
