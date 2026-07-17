import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhookIngestionService } from './webhook-ingestion.service';

@Module({
  controllers: [WebhooksController],
  providers: [WebhookIngestionService],
  exports: [WebhookIngestionService],
})
export class WebhooksModule {}
