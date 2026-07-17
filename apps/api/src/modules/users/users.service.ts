import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { CreateUserDto } from '@birvo/contracts';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string) {
    const memberships = await this.prisma.client.membership.findMany({
      where: { organizationId },
      include: { user: true, role: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      membershipId: m.publicId,
      userId: m.user.publicId,
      name: m.user.name,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      status: m.status,
      role: m.role.name,
      createdAt: m.createdAt,
    }));
  }

  async create(organizationId: string, actorUserId: string, dto: CreateUserDto) {
    const role = await this.prisma.client.role.findFirst({
      where: { publicId: dto.roleId, organizationId },
    });
    if (!role) throw new BadRequestException('El rol especificado no existe en esta organización.');

    const existing = await this.prisma.client.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      const alreadyMember = await this.prisma.client.membership.findFirst({
        where: { organizationId, userId: existing.id },
      });
      if (alreadyMember) throw new BadRequestException('Este usuario ya pertenece a la organización.');
    }

    const temporaryPassword = dto.password ?? randomBytes(9).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const user =
      existing ??
      (await this.prisma.client.user.create({
        data: { name: dto.name, email: dto.email, passwordHash, status: 'active' },
      }));

    const membership = await this.prisma.client.membership.create({
      data: { organizationId, userId: user.id, roleId: role.id, status: 'active' },
      include: { role: true },
    });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'create',
      entityType: 'membership',
      entityId: membership.id,
      metadata: { invitedEmail: dto.email, role: role.name },
    });

    return {
      membershipId: membership.publicId,
      userId: user.publicId,
      email: user.email,
      role: membership.role.name,
      // Solo se devuelve en el MVP porque no hay envío de correo real configurado (Mailpit disponible en desarrollo).
      temporaryPassword: dto.password ? undefined : temporaryPassword,
    };
  }

  async updateRole(organizationId: string, actorUserId: string, membershipPublicId: string, rolePublicId: string) {
    const [membership, role] = await Promise.all([
      this.prisma.client.membership.findFirst({ where: { publicId: membershipPublicId, organizationId } }),
      this.prisma.client.role.findFirst({ where: { publicId: rolePublicId, organizationId } }),
    ]);
    if (!membership) throw new NotFoundException('Miembro no encontrado.');
    if (!role) throw new BadRequestException('El rol especificado no existe en esta organización.');

    const updated = await this.prisma.client.membership.update({
      where: { id: membership.id },
      data: { roleId: role.id },
      include: { role: true },
    });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'update',
      entityType: 'membership',
      entityId: membership.id,
      metadata: { newRole: role.name },
    });

    return { membershipId: updated.publicId, role: updated.role.name };
  }

  async updateStatus(organizationId: string, actorUserId: string, membershipPublicId: string, status: 'active' | 'suspended') {
    const membership = await this.prisma.client.membership.findFirst({
      where: { publicId: membershipPublicId, organizationId },
    });
    if (!membership) throw new NotFoundException('Miembro no encontrado.');

    const updated = await this.prisma.client.membership.update({
      where: { id: membership.id },
      data: { status },
    });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'update',
      entityType: 'membership',
      entityId: membership.id,
      metadata: { status },
    });

    return updated;
  }
}
