import { Module } from '@nestjs/common';
import { DevSandboxController } from './dev-sandbox.controller';
import { DevSandboxService } from './dev-sandbox.service';
import { DevOnlyGuard } from './dev-only.guard';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  controllers: [DevSandboxController],
  providers: [DevSandboxService, DevOnlyGuard],
})
export class DevSandboxModule {}
