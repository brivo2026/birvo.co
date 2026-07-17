import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { Public } from '../../common/decorators/public.decorator';
import { LocalDiskStorageProvider } from '../../storage/local-disk-storage.provider';

/**
 * Sirve archivos cuando STORAGE_DRIVER=local (ver ADR-0006), simulando el
 * comportamiento de una URL firmada de S3/MinIO. El token incluye
 * expiración y firma HMAC (ver LocalDiskStorageProvider).
 */
@ApiTags('storage')
@Controller({ path: 'storage/local', version: '1' })
export class StorageController {
  constructor(private readonly localStorage: LocalDiskStorageProvider) {}

  @Get(':token')
  @Public()
  async serve(@Param('token') token: string, @Res() reply: FastifyReply) {
    const verified = this.localStorage.verifyToken(token);
    if (!verified) throw new NotFoundException('Enlace inválido o expirado.');

    const exists = await this.localStorage.exists(verified.key);
    if (!exists) throw new NotFoundException('Archivo no encontrado.');

    const buffer = await this.localStorage.readFile(verified.key);
    void reply.header('Cache-Control', 'private, max-age=60').send(buffer);
  }
}
