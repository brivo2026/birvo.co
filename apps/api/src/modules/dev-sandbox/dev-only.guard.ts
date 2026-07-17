import { CanActivate, ExecutionContext, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BIRVO_ENV, type BirvoEnv } from '../../config/config.module';

/**
 * Hace que /dev/sandbox (y sus endpoints) devuelvan 404 fuera de
 * development, tal como exige la especificación §17: "Esta pantalla solo
 * debe estar disponible en development".
 */
@Injectable()
export class DevOnlyGuard implements CanActivate {
  constructor(@Inject(BIRVO_ENV) private readonly env: BirvoEnv) {}

  canActivate(_context: ExecutionContext): boolean {
    if (this.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    return true;
  }
}
