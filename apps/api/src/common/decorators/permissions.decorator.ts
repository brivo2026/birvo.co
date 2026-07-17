import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@birvo/contracts';

export const PERMISSIONS_KEY = 'requiredPermissions';

/** Declara los permisos requeridos para acceder a un endpoint (evaluados por PermissionsGuard). */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
