import { Module } from '@nestjs/common';
import { TranscriptionsController } from './transcriptions.controller';

@Module({
  controllers: [TranscriptionsController],
})
export class TranscriptionsModule {}
