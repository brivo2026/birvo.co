import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './database/prisma.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SessionAuthGuard } from './common/guards/session-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { TagsModule } from './modules/tags/tags.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { TranscriptionsModule } from './modules/transcriptions/transcriptions.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { DevSandboxModule } from './modules/dev-sandbox/dev-sandbox.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Infraestructura transversal (global)
    ConfigModule,
    PrismaModule,
    QueueModule,
    StorageModule,
    RealtimeModule,
    ChannelsModule,

    // Identidad y organización
    AuthModule,
    OrganizationsModule,
    UsersModule,
    RolesModule,

    // Bandeja / dominio conversacional
    ContactsModule,
    ConversationsModule,
    MessagesModule,
    TagsModule,
    AttachmentsModule,

    // Automatización e IA
    AutomationsModule,
    AiAssistantModule,
    TranscriptionsModule,

    // Analítica, notificaciones, auditoría
    AnalyticsModule,
    NotificationsModule,
    AuditModule,

    // Canales entrantes / desarrollo
    WebhooksModule,
    DevSandboxModule,

    // Observabilidad
    HealthModule,
  ],
  providers: [
    // Orden importa: SessionAuthGuard debe ejecutarse antes que PermissionsGuard.
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
