import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { simulateInboundMessageSchema, type SessionUser, type SimulateInboundMessageDto } from '@birvo/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../auth/dto/zod-dto';
import { DevSandboxService } from './dev-sandbox.service';
import { DevOnlyGuard } from './dev-only.guard';

/** Backend de la pantalla /dev/sandbox del frontend (solo development, ver DevOnlyGuard). */
@ApiTags('dev-sandbox')
@UseGuards(DevOnlyGuard)
@Controller({ path: 'dev/sandbox', version: '1' })
export class DevSandboxController {
  constructor(private readonly devSandboxService: DevSandboxService) {}

  @Get('contacts')
  listDemoContacts(@CurrentUser() user: SessionUser) {
    return this.devSandboxService.listDemoContacts(user.organizationId);
  }

  @Post('simulate-inbound')
  simulateInbound(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(simulateInboundMessageSchema)) dto: SimulateInboundMessageDto,
  ) {
    return this.devSandboxService.simulateInbound(user, dto);
  }

  @Post('conversations/:conversationId/trigger-ai')
  triggerAi(@CurrentUser() user: SessionUser, @Param('conversationId') conversationId: string) {
    return this.devSandboxService.triggerAiNow(user, conversationId);
  }

  @Post('messages/:messageId/simulate-delivery')
  simulateDelivery(@CurrentUser() user: SessionUser, @Param('messageId') messageId: string) {
    return this.devSandboxService.simulateDeliveryProgression(user, messageId);
  }
}
