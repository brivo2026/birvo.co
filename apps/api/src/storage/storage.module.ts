import { Global, Module } from '@nestjs/common';
import { BIRVO_ENV, type BirvoEnv } from '../config/config.module';
import { STORAGE_PROVIDER } from './storage-provider.interface';
import { S3StorageProvider } from './s3-storage.provider';
import { LocalDiskStorageProvider } from './local-disk-storage.provider';

@Global()
@Module({
  providers: [
    LocalDiskStorageProvider,
    S3StorageProvider,
    {
      provide: STORAGE_PROVIDER,
      useFactory: (env: BirvoEnv, local: LocalDiskStorageProvider, s3: S3StorageProvider) =>
        env.STORAGE_DRIVER === 's3' ? s3 : local,
      inject: [BIRVO_ENV, LocalDiskStorageProvider, S3StorageProvider],
    },
  ],
  exports: [STORAGE_PROVIDER, LocalDiskStorageProvider],
})
export class StorageModule {}
