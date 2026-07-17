import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { StorageController } from './storage.controller';

@Module({
  controllers: [AttachmentsController, StorageController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
