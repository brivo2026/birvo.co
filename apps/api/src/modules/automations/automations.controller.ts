import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionUser } from '@birvo/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PrismaService } from '../../database/prisma.service';

/**
 * Alcance del MVP: la automatización principal (temporizador de
 * inactividad -> IA) se configura desde /settings/ai (ver AiAssistantModule)
 * y se ejecuta en apps/worker. Este módulo expone el historial de
 * ejecuciones (AutomationRun) para trazabilidad. Un constructor visual de
 * reglas por palabra clave queda fuera de alcance de esta primera versión
 * (el modelo de datos `Automation`/`AutomationRun` ya está preparado para
 * soportarlo sin cambios de esquema).
 */
@ApiTags('automations')
@Controller({ path: 'automation-runs', version: '1' })
export class AutomationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('automations:manage')
  async list(@CurrentUser() user: SessionUser, @Query('page') page = '1') {
    const take = 25;
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [items, total] = await Promise.all([
      this.prisma.client.automationRun.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { conversation: { include: { contact: true } } },
      }),
      this.prisma.client.automationRun.count({ where: { organizationId: user.organizationId } }),
    ]);

    return {
      items: items.map((r) => ({
        id: r.publicId,
        status: r.status,
        contactName: r.conversation.contact.name,
        conversationId: r.conversation.publicId,
        result: r.result,
        createdAt: r.createdAt,
      })),
      page: Number(page) || 1,
      pageSize: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    };
  }
}
