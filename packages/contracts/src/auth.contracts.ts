import { z } from 'zod';

export const registerOrganizationSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  timezone: z.string().default('America/Bogota'),
  ownerName: z.string().trim().min(2).max(120),
  ownerEmail: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72)
    .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
});
export type RegisterOrganizationDto = z.infer<typeof registerOrganizationSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});
export type RequestPasswordResetDto = z.infer<typeof requestPasswordResetSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  roleId: z.string().uuid(),
  password: z.string().min(8).max(72).optional(),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

export const sessionUserSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().nullable(),
  organizationId: z.string().uuid(),
  organizationName: z.string(),
  organizationSlug: z.string(),
  membershipId: z.string().uuid(),
  roleId: z.string().uuid(),
  roleName: z.string(),
  permissions: z.array(z.string()),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;
