import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionUser } from '@birvo/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AttachmentsService } from './attachments.service';

@ApiTags('attachments')
@Controller({ path: 'attachments', version: '1' })
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get(':attachmentId/download-url')
  getDownloadUrl(@CurrentUser() user: SessionUser, @Param('attachmentId') attachmentId: string) {
    return this.attachmentsService.getDownloadUrl(user, attachmentId);
  }

  @Post(':attachmentId/retry-transcription')
  retryTranscription(@CurrentUser() user: SessionUser, @Param('attachmentId') attachmentId: string) {
    return this.attachmentsService.retryTranscription(user, attachmentId);
  }
}
