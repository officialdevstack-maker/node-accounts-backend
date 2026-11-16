import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { config } from './core/config/index.js';

function encryptionKey(): Buffer {
  const appKey = config('app.key');
  if (!appKey) throw new Error('APP_KEY must be configured to store BVNs securely.');
  return createHash('sha256').update(appKey).digest();
}

export function hashBvn(bvn: string): string {
  const appKey = config('app.key');
  if (!appKey) throw new Error('APP_KEY must be configured to store BVNs securely.');
  return createHmac('sha256', appKey).update(`bvn:${bvn}`).digest('hex');
}

export function maskBvn(bvn: string): string {
  return `${'*'.repeat(Math.max(0, bvn.length - 4))}${bvn.slice(-4)}`;
}

export function encryptBvn(bvn: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(bvn, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${ciphertext.toString('base64url')}`;
}

export function decryptBvn(value: string): string {
  const [version, encodedIv, encodedTag, encodedCiphertext] = value.split(':');
  if (version !== 'v1' || !encodedIv || !encodedTag || !encodedCiphertext) {
    throw new Error('Stored BVN has an unsupported encryption format.');
  }

  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(encodedIv, 'base64url'));
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
