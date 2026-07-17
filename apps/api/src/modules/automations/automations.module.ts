import { Module } from '@nestjs/common';
import { AutomationsController } from './automations.controller';

@Module({
  controllers: [AutomationsController],
})
export class AutomationsModule {}
