export interface UploadInput {
  key: string;
  body: Buffer;
  mimeType: string;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<{ key: string }>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
