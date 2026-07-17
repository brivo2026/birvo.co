import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';
import type { SessionUser } from '@birvo/contracts';

@ApiTags('audit')
@Controller({ path: 'audit-logs', version: '1' })
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('audit:view')
  async list(
    @CurrentUser() user: SessionUser,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '25',
  ) {
    const take = Math.min(Number(pageSize) || 25, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [items, total] = await Promise.all([
      this.prisma.client.auditLog.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { actorUser: { select: { name: true, email: true } } },
      }),
      this.prisma.client.auditLog.count({ where: { organizationId: user.organizationId } }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.publicId,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        actor: item.actorUser ? { name: item.actorUser.name, email: item.actorUser.email } : null,
        metadata: item.metadata,
        createdAt: item.createdAt,
      })),
      page: Number(page) || 1,
      pageSize: take,
      total,
      totalPages: Math.ceil(total / take),
    };
  }
}
