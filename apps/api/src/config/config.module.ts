import { Global, Module } from '@nestjs/common';
import { loadEnv, type BirvoEnv } from '@birvo/config';

export const BIRVO_ENV = Symbol('BIRVO_ENV');

@Global()
@Module({
  providers: [{ provide: BIRVO_ENV, useValue: loadEnv() }],
  exports: [BIRVO_ENV],
})
export class ConfigModule {}

export type { BirvoEnv };
