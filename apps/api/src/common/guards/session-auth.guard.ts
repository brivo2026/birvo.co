import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import type { SessionUser } from '@birvo/contracts';
import { ROLE_PERMISSIONS } from '@birvo/contracts';
import { PrismaService } from '../../database/prisma.service';
import { SessionService } from '../services/session.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Valida la cookie de sesión httpOnly, resuelve el usuario/membresía/rol
 * vigentes en base de datos (no confía ciegamente en el JWT: revalida
 * `sessionVersion` y el estado de la membresía) y adjunta `sessionUser` a
 * la request para el resto del pipeline (CurrentUser(), PermissionsGuard,
 * TenantContext implícito).
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<FastifyRequest & { sessionUser?: SessionUser }>();

    const token = request.cookies?.[this.sessionService.cookieName];

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Sesión no encontrada. Inicia sesión para continuar.');
    }

    let payload;
    try {
      payload = this.sessionService.verify(token);
    } catch {
      if (isPublic) return true;
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }

    const membership = await this.prisma.client.membership.findFirst({
      where: { id: payload.membershipId, status: 'active' },
      include: { user: true, role: true, organization: true },
    });

    if (
      !membership ||
      membership.user.status !== 'active' ||
      membership.user.sessionVersion !== payload.sessionVersion ||
      membership.organization.status === 'suspended'
    ) {
      if (isPublic) return true;
      throw new UnauthorizedException('Sesión revocada. Inicia sesión nuevamente.');
    }

    const permissions =
      membership.role.permissions.length > 0
        ? membership.role.permissions
        : (ROLE_PERMISSIONS[membership.role.name as keyof typeof ROLE_PERMISSIONS] ?? []);

    request.sessionUser = {
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

    return true;
  }
}
