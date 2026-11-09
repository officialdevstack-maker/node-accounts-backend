import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, type KeyObject } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config } from '../core/config/index.js';

export interface SigningKey {
  kid: string;
  privatePem: string;
  publicPem: string;
  jwk: Record<string, unknown>;
}

let cached: SigningKey | undefined;
let cachedRetired: Array<{ kid: string; publicPem: string; jwk: Record<string, unknown> }> | undefined;

const kidOf = (publicKey: KeyObject): string =>
  createHash('sha256')
    .update(publicKey.export({ type: 'spki', format: 'der' }))
    .digest('base64url')
    .slice(0, 16);

function loadPem(): string {
  const fromEnv = config('oidc.privateKey');
  if (fromEnv) return fromEnv.replace(/\\n/g, '\n');

  const path = resolve(process.cwd(), config('oidc.keyPath'));
  if (existsSync(path)) return readFileSync(path, 'utf8');

  if (config('app.env') === 'production') throw new Error('OIDC_PRIVATE_KEY is required in production.');

  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, pem, { mode: 0o600 });
  return pem;
}

export function signingKey(): SigningKey {
  if (cached) return cached;

  const privateKey = createPrivateKey(loadPem());
  const publicKey = createPublicKey(privateKey);
  const kid = kidOf(publicKey);

  cached = {
    kid,
    privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    jwk: { ...publicKey.export({ format: 'jwk' }), kid, use: 'sig', alg: 'RS256' },
  };
  return cached;
}

function retiredKeys(): Array<{ kid: string; publicPem: string; jwk: Record<string, unknown> }> {
  if (cachedRetired) return cachedRetired;
  cachedRetired = config('oidc.retiredPublicKeys').map((raw) => {
    const publicKey = createPublicKey(raw.replace(/\\n/g, '\n'));
    if (publicKey.asymmetricKeyType !== 'rsa') {
      throw new Error('OIDC_RETIRED_PUBLIC_KEYS must contain RSA public keys.');
    }
    const kid = kidOf(publicKey);
    return {
      kid,
      publicPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      jwk: { ...publicKey.export({ format: 'jwk' }), kid, use: 'sig', alg: 'RS256' },
    };
  });
  return cachedRetired;
}

export function verificationKey(kid: string | undefined): string {
  const current = signingKey();
  if (!kid || kid === current.kid) return current.publicPem;
  const retired = retiredKeys().find((key) => key.kid === kid);
  if (!retired) throw new Error('Unknown OIDC signing key.');
  return retired.publicPem;
}

export const publicJwks = () => ({ keys: [signingKey().jwk, ...retiredKeys().map((key) => key.jwk)] });
