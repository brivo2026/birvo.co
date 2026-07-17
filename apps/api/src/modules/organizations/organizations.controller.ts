import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { SessionUser } from '@birvo/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ZodValidationPipe } from '../auth/dto/zod-dto';

const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  timezone: z.string().min(1).optional(),
});

@ApiTags('organizations')
@Controller({ path: 'organization', version: '1' })
export class OrganizationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async get(@CurrentUser() user: SessionUser) {
    const org = await this.prisma.client.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
    });
    return {
      id: org.publicId,
      name: org.name,
      slug: org.slug,
      status: org.status,
      timezone: org.timezone,
      createdAt: org.createdAt,
    };
  }

  @Patch()
  @RequirePermissions('org:manage')
  async update(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(updateOrganizationSchema)) dto: z.infer<typeof updateOrganizationSchema>,
  ) {
    const updated = await this.prisma.client.organization.update({
      where: { id: user.organizationId },
      data: dto,
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: 'update',
      entityType: 'organization',
      entityId: user.organizationId,
      metadata: dto,
    });
    return { id: updated.publicId, name: updated.name, timezone: updated.timezone };
  }
}
