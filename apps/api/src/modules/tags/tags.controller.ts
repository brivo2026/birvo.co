import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { SessionUser } from '@birvo/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PrismaService } from '../../database/prisma.service';
import { ZodValidationPipe } from '../auth/dto/zod-dto';

const createTagSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#7C3AED'),
});

@ApiTags('tags')
@Controller({ path: 'tags', version: '1' })
export class TagsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: SessionUser) {
    const tags = await this.prisma.client.tag.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: 'asc' },
    });
    return tags.map((t) => ({ id: t.publicId, name: t.name, color: t.color }));
  }

  @Post()
  @RequirePermissions('tags:manage')
  async create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createTagSchema)) dto: z.infer<typeof createTagSchema>,
  ) {
    const tag = await this.prisma.client.tag.create({
      data: { organizationId: user.organizationId, name: dto.name, color: dto.color },
    });
    return { id: tag.publicId, name: tag.name, color: tag.color };
  }

  @Delete(':tagId')
  @RequirePermissions('tags:manage')
  async remove(@CurrentUser() user: SessionUser, @Param('tagId') tagId: string) {
    await this.prisma.client.tag.deleteMany({ where: { publicId: tagId, organizationId: user.organizationId } });
    return { success: true };
  }
}
