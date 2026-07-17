import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SessionUser } from '@birvo/contracts';
import type { FastifyRequest } from 'fastify';

/**
 * Extrae el usuario de sesión ya autenticado y verificado por
 * SessionAuthGuard. NUNCA usar el organizationId proveniente del body o
 * query del cliente: siempre usar `currentUser.organizationId`.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): SessionUser => {
  const request = ctx.switchToHttp().getRequest<FastifyRequest & { sessionUser?: SessionUser }>();
  if (!request.sessionUser) {
    throw new Error('CurrentUser() usado en una ruta sin SessionAuthGuard aplicado');
  }
  return request.sessionUser;
});
