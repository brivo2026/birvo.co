import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { updateAiConfigurationSchema, type SessionUser, type UpdateAiConfigurationDto } from '@birvo/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../auth/dto/zod-dto';
import { AiAssistantService } from './ai-assistant.service';

@ApiTags('ai-assistant')
@Controller({ path: 'ai', version: '1' })
export class AiAssistantController {
  constructor(private readonly aiService: AiAssistantService) {}

  @Get('configuration')
  getConfiguration(@CurrentUser() user: SessionUser) {
    return this.aiService.getConfiguration(user.organizationId);
  }

  @Patch('configuration')
  @RequirePermissions('ai:configure')
  updateConfiguration(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(updateAiConfigurationSchema)) dto: UpdateAiConfigurationDto,
  ) {
    return this.aiService.updateConfiguration(user.organizationId, dto);
  }

  @Get('conversations/:conversationId/executions')
  listExecutions(@CurrentUser() user: SessionUser, @Param('conversationId') conversationId: string) {
    return this.aiService.listExecutions(user, conversationId);
  }

  @Post('conversations/:conversationId/executions/:executionId/accept')
  @RequirePermissions('conversations:reply')
  acceptSuggestion(
    @CurrentUser() user: SessionUser,
    @Param('conversationId') conversationId: string,
    @Param('executionId') executionId: string,
  ) {
    return this.aiService.acceptSuggestion(user, conversationId, executionId);
  }
}
