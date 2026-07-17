import { Inject, Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { BIRVO_ENV, type BirvoEnv } from '../config/config.module';
import type { StorageProvider, UploadInput } from './storage-provider.interface';

/**
 * Implementación de respaldo sin dependencias externas (ver ADR-0006).
 * Genera "URLs firmadas" simples (HMAC + expiración) servidas por un
 * endpoint propio de la API (`GET /v1/storage/local/:token`).
 */
@Injectable()
export class LocalDiskStorageProvider implements StorageProvider {
  private readonly basePath: string;
  private readonly secret: string;

  constructor(@Inject(BIRVO_ENV) env: BirvoEnv) {
    this.basePath = resolve(process.cwd(), env.STORAGE_LOCAL_PATH);
    this.secret = env.CREDENTIALS_ENCRYPTION_KEY;
  }

  private resolvePath(key: string): string {
    return join(this.basePath, key);
  }

  async upload(input: UploadInput): Promise<{ key: string }> {
    const filePath = this.resolvePath(input.key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, input.body);
    return { key: input.key };
  }

  async getSignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const signature = this.sign(key, expiresAt);
    const token = Buffer.from(JSON.stringify({ key, expiresAt, signature })).toString('base64url');
    return `/v1/storage/local/${token}`;
  }

  verifyToken(token: string): { key: string } | null {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as {
        key: string;
        expiresAt: number;
        signature: string;
      };
      if (Date.now() > decoded.expiresAt) return null;
      const expected = this.sign(decoded.key, decoded.expiresAt);
      if (expected !== decoded.signature) return null;
      return { key: decoded.key };
    } catch {
      return null;
    }
  }

  async readFile(key: string): Promise<Buffer> {
    return readFile(this.resolvePath(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolvePath(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.resolvePath(key));
      return true;
    } catch {
      return false;
    }
  }

  private sign(key: string, expiresAt: number): string {
    return createHmac('sha256', this.secret).update(`${key}:${expiresAt}`).digest('hex');
  }
}
