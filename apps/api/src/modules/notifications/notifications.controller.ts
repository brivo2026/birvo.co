import { Controller, Get, Patch, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionUser } from '@birvo/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('notifications')
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: SessionUser) {
    const notifications = await this.prisma.client.notification.findMany({
      where: { organizationId: user.organizationId, userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return notifications.map((n) => ({
      id: n.publicId,
      type: n.type,
      title: n.title,
      body: n.body,
      conversationId: n.conversationId,
      readAt: n.readAt,
      createdAt: n.createdAt,
    }));
  }

  @Patch(':notificationId/read')
  async markAsRead(@CurrentUser() user: SessionUser, @Param('notificationId') notificationId: string) {
    await this.prisma.client.notification.updateMany({
      where: { publicId: notificationId, userId: user.userId, organizationId: user.organizationId },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}
