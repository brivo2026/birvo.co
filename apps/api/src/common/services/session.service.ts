import { Inject, Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import type { SessionUser } from '@birvo/contracts';
import { BIRVO_ENV, type BirvoEnv } from '../../config/config.module';

export interface SessionTokenPayload {
  sub: string; // userId
  organizationId: string;
  membershipId: string;
  roleId: string;
  sessionVersion: number;
}

/**
 * Emite y verifica el JWT de sesión que viaja en la cookie httpOnly. Ver
 * ADR-0003. `sessionVersion` permite revocar todas las sesiones de un
 * usuario incrementando el contador en la tabla `User`.
 */
@Injectable()
export class SessionService {
  constructor(@Inject(BIRVO_ENV) private readonly env: BirvoEnv) {}

  sign(payload: SessionTokenPayload): string {
    return jwt.sign(payload, this.env.SESSION_JWT_SECRET, {
      expiresIn: `${this.env.SESSION_TTL_HOURS}h`,
      issuer: 'birvo-api',
    });
  }

  verify(token: string): SessionTokenPayload {
    return jwt.verify(token, this.env.SESSION_JWT_SECRET, { issuer: 'birvo-api' }) as SessionTokenPayload;
  }

  get cookieName(): string {
    return this.env.SESSION_COOKIE_NAME;
  }

  cookieOptions() {
    // En producción, web y api suelen vivir en dominios distintos (p. ej.
    // subdominios *.onrender.com, tratados como sitios distintos), por lo
    // que la cookie de sesión necesita SameSite=None + Secure para viajar en
    // las peticiones fetch con credentials:'include'. En desarrollo local
    // ambos corren en localhost con puertos distintos pero el mismo sitio,
    // donde 'lax' es suficiente y no requiere HTTPS.
    const isProduction = this.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      secure: isProduction,
      path: '/',
      maxAge: this.env.SESSION_TTL_HOURS * 60 * 60,
    };
  }
}

export type { SessionUser };
