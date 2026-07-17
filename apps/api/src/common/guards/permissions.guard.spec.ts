import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import type { SessionUser } from '@birvo/contracts';

function buildContext(sessionUser: SessionUser | undefined): ExecutionContext {
  const request = { sessionUser };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('permite el acceso cuando el endpoint no requiere permisos', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(buildContext(undefined))).toBe(true);
  });

  it('permite el acceso cuando el usuario tiene todos los permisos requeridos', () => {
    const reflector = { getAllAndOverride: () => ['conversations:assign'] } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const user = { permissions: ['conversations:assign', 'conversations:reply'] } as SessionUser;
    expect(guard.canActivate(buildContext(user))).toBe(true);
  });

  it('rechaza el acceso cuando falta un permiso requerido (RBAC por rol)', () => {
    const reflector = { getAllAndOverride: () => ['members:manage'] } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    // Un "agent" no tiene members:manage según ROLE_PERMISSIONS (packages/contracts).
    const agentUser = { permissions: ['conversations:view_assigned', 'conversations:reply'] } as SessionUser;
    expect(() => guard.canActivate(buildContext(agentUser))).toThrow(ForbiddenException);
  });

  it('rechaza el acceso si no hay usuario de sesión', () => {
    const reflector = { getAllAndOverride: () => ['members:manage'] } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(ForbiddenException);
  });
});
