import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from './logger';

export interface UploadInput {
  key: string;
  body: Buffer;
  mimeType: string;
}

/**
 * Implementación mínima de escritura de almacenamiento para apps/worker
 * (descarga de adjuntos entrantes). Sigue la misma interfaz conceptual que
 * apps/api/src/storage (ver ADR-0006); se mantiene una implementación
 * separada y deliberadamente pequeña para no acoplar el worker a NestJS.
 */
async function uploadLocal(input: UploadInput): Promise<{ key: string }> {
  const basePath = resolve(process.cwd(), env.STORAGE_LOCAL_PATH);
  const filePath = join(basePath, input.key);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, input.body);
  return { key: input.key };
}

const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
});

async function uploadS3(input: UploadInput): Promise<{ key: string }> {
  await s3Client.send(
    new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: input.key, Body: input.body, ContentType: input.mimeType }),
  );
  return { key: input.key };
}

export async function uploadAttachment(input: UploadInput): Promise<{ key: string }> {
  return env.STORAGE_DRIVER === 's3' ? uploadS3(input) : uploadLocal(input);
}
