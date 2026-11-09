import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '../core/config/index.js';

export interface AvatarStorage {
  get(filename: string): Promise<Buffer | null>;
  put(filename: string, content: Buffer, contentType: string): Promise<void>;
  delete(filename: string): Promise<void>;
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

class LocalAvatarStorage implements AvatarStorage {
  private directory(): string {
    return resolve(process.cwd(), config('storage.disks.public.root'), 'avatars');
  }

  async get(filename: string): Promise<Buffer | null> {
    try {
      return await readFile(join(this.directory(), filename));
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }

  async put(filename: string, content: Buffer): Promise<void> {
    await mkdir(this.directory(), { recursive: true });
    await writeFile(join(this.directory(), filename), content, { flag: 'wx' });
  }

  async delete(filename: string): Promise<void> {
    try {
      await unlink(join(this.directory(), filename));
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }
  }
}

class S3AvatarStorage implements AvatarStorage {
  private readonly client: S3Client;

  constructor() {
    const endpoint = config('storage.s3.endpoint');
    this.client = new S3Client({
      region: config('storage.s3.region'),
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle: Boolean(endpoint),
      credentials: {
        accessKeyId: config('storage.s3.accessKeyId'),
        secretAccessKey: config('storage.s3.secretAccessKey'),
      },
    });
  }

  async get(filename: string): Promise<Buffer | null> {
    try {
      const result = await this.client.send(new GetObjectCommand({
        Bucket: config('storage.s3.bucket'),
        Key: `avatars/${filename}`,
      }));
      if (!result.Body) return null;
      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error) {
      if (
        error instanceof Error &&
        (
          error.name === 'NoSuchKey' ||
          ('$metadata' in error &&
            typeof error.$metadata === 'object' &&
            error.$metadata !== null &&
            'httpStatusCode' in error.$metadata &&
            error.$metadata.httpStatusCode === 404)
        )
      ) return null;
      throw error;
    }
  }

  async put(filename: string, content: Buffer, contentType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: config('storage.s3.bucket'),
      Key: `avatars/${filename}`,
      Body: content,
      ContentType: contentType,
    }));
  }

  async delete(filename: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: config('storage.s3.bucket'),
      Key: `avatars/${filename}`,
    }));
  }
}

const local = new LocalAvatarStorage();
let s3: S3AvatarStorage | undefined;

export function avatarStorage(): AvatarStorage {
  if (config('storage.avatarDriver') === 'local') return local;
  return (s3 ??= new S3AvatarStorage());
}
