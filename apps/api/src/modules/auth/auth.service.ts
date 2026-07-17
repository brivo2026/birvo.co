import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'node:crypto';
import type { LoginDto, RegisterOrganizationDto, SessionUser } from '@birvo/contracts';
import { ROLE_PERMISSIONS, RoleName } from '@birvo/contracts';
import { AuthRepository } from './auth.repository';
import { SessionService } from '../../common/services/session.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../database/prisma.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const DIACRITICS_PATTERN = new RegExp('[\\u0300-\\u036f]', 'g');

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(DIACRITICS_PATTERN, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'org'
  );
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly repo: AuthRepository,
    private readonly sessionService: SessionService,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async registerOrganization(dto: RegisterOrganizationDto) {
    const existingUser = await this.repo.findUserByEmail(dto.ownerEmail);
    // Mensaje deliberadamente genérico para evitar enumeración de cuentas.
    if (existingUser) {
      throw new BadRequestException('No fue posible completar el registro con los datos proporcionados.');
    }

    let slug = slugify(dto.organizationName);
    let attempt = 0;
    while (await this.repo.findOrganizationBySlug(attempt === 0 ? slug : `${slug}-${attempt}`)) {
      attempt += 1;
    }
    if (attempt > 0) slug = `${slug}-${attempt}`;

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const { organization, membership } = await this.repo.createOrganizationWithOwner({
      organizationName: dto.organizationName,
      slug,
      timezone: dto.timezone,
      ownerName: dto.ownerName,
      ownerEmail: dto.ownerEmail,
      passwordHash,
    });

    await this.audit.record({
      organizationId: organization.id,
      actorUserId: membership.userId,
      action: 'create',
      entityType: 'organization',
      entityId: organization.id,
      metadata: { source: 'self-service-registration' },
    });

    const sessionUser = this.toSessionUser(membership);
    const token = this.sessionService.sign({
      sub: membership.userId,
      organizationId: organization.id,
      membershipId: membership.id,
      roleId: membership.roleId,
      sessionVersion: membership.user.sessionVersion,
    });

    return { token, sessionUser };
  }

  async login(dto: LoginDto, context: { ipAddress?: string; userAgent?: string }) {
    const user = await this.repo.findUserByEmail(dto.email);

    // Siempre se ejecuta un hash aunque el usuario no exista, para mitigar
    // ataques de timing que permitirían enumerar cuentas.
    const passwordHashToCompare = user?.passwordHash ?? '$2a$12$invalidsaltinvalidsaltinvalidsal.tuxxxxxxxxxxxxxxxxxxx';
    const passwordMatches = await bcrypt.compare(dto.password, passwordHashToCompare).catch(() => false);

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        `Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta nuevamente más tarde.`,
      );
    }

    if (!passwordMatches) {
      const attempts = user.failedLoginAttempts + 1;
      const lockUntil =
        attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : undefined;
      await this.repo.registerFailedLogin(user.id, lockUntil);
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    await this.repo.resetFailedLogins(user.id);

    const membership = await this.prisma.client.membership.findFirst({
      where: { userId: user.id, status: 'active' },
      include: { role: true, user: true, organization: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!membership) {
      throw new UnauthorizedException('El usuario no tiene una organización activa asociada.');
    }

    await this.audit.record({
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: 'login',
      entityType: 'user',
      entityId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const sessionUser = this.toSessionUser(membership);
    const token = this.sessionService.sign({
      sub: user.id,
      organizationId: membership.organizationId,
      membershipId: membership.id,
      roleId: membership.roleId,
      sessionVersion: user.sessionVersion,
    });

    return { token, sessionUser };
  }

  async logout(userId: string, organizationId: string): Promise<void> {
    await this.audit.record({
      organizationId,
      actorUserId: userId,
      action: 'logout',
      entityType: 'user',
      entityId: userId,
    });
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.repo.incrementSessionVersion(userId);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.repo.findUserByEmail(email);
    // Respuesta idéntica exista o no el usuario (mitiga enumeración).
    if (!user) {
      this.logger.debug(`Solicitud de reseteo para email no registrado: ${email}`);
      return;
    }
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.client.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // En producción esto se enviaría por correo (Mailpit en desarrollo).
    // Se registra en logs de desarrollo únicamente para permitir probar el flujo end-to-end.
    this.logger.log(`[DEV] Token de reseteo de contraseña para ${email}: ${rawToken}`);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const resetToken = await this.prisma.client.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('El enlace de recuperación es inválido o ha expirado.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.client.$transaction([
      this.prisma.client.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      }),
      this.prisma.client.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  private toSessionUser(membership: {
    id: string;
    organizationId: string;
    roleId: string;
    user: { id: string; name: string; email: string; avatarUrl: string | null; sessionVersion: number };
    role: { name: string; permissions: string[] };
    organization: { name: string; slug: string };
  }): SessionUser {
    const permissions =
      membership.role.permissions.length > 0
        ? membership.role.permissions
        : (ROLE_PERMISSIONS[membership.role.name as RoleName] ?? []);

    return {
      userId: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      avatarUrl: membership.user.avatarUrl,
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      organizationSlug: membership.organization.slug,
      membershipId: membership.id,
      roleId: membership.roleId,
      roleName: membership.role.name,
      permissions,
    };
  }
}
