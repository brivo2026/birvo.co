import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca un endpoint como accesible sin sesión autenticada (login, registro, webhooks). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
