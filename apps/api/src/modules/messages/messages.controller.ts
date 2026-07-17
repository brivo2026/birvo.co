import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  listMessagesQuerySchema,
  sendMessageSchema,
  type ListMessagesQuery,
  type SendMessageDto,
  type SessionUser,
} from '@birvo/contracts';
import { MessagesService } from './messages.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../auth/dto/zod-dto';

@ApiTags('messages')
@Controller({ path: 'conversations/:conversationId/messages', version: '1' })
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Param('conversationId') conversationId: string,
    @Query(new ZodValidationPipe(listMessagesQuerySchema)) query: ListMessagesQuery,
  ) {
    return this.messagesService.list(user, conversationId, query);
  }

  @Post()
  @RequirePermissions('conversations:reply')
  send(
    @CurrentUser() user: SessionUser,
    @Param('conversationId') conversationId: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) dto: SendMessageDto,
  ) {
    return this.messagesService.send(user, conversationId, dto);
  }
}
