import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';
import type { SessionUser } from '@birvo/contracts';

/**
 * Los roles del MVP son 5 roles de sistema creados automáticamente al
 * registrar la organización (owner, admin, supervisor, agent, viewer, ver
 * ADR y AuthRepository.createOrganizationWithOwner). La edición de
 * permisos por rol queda fuera del alcance del MVP; este endpoint es
 * solo de lectura para poblar selects de "asignar rol" en /team.
 */
@ApiTags('roles')
@Controller({ path: 'roles', version: '1' })
export class RolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: SessionUser) {
    const roles = await this.prisma.client.role.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'asc' },
    });
    return roles.map((role) => ({
      id: role.publicId,
      name: role.name,
      permissions: role.permissions,
    }));
  }
}
