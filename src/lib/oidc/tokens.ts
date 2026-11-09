import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import type { User } from '../../models/User.js';
import { config } from '../core/config/index.js';
import { claimsFor } from './claims.js';
import { signingKey, verificationKey } from './keys.js';
import { randomToken } from './util.js';

export interface AccessClaims {
  sub: string;
  clientId: string;
  gid: number;
  scopes: string[];
  exp: number;
  grantType: 'authorization_code' | 'client_credentials';
}

export interface ServiceClaims {
  clientId: string;
  scopes: string[];
  exp: number;
}

type AccessTokenInput =
  | { userId: number; subject?: never; clientId: string; grantId: number; scopes: string[]; grantType?: 'authorization_code' }
  | { userId?: never; subject: string; clientId: string; grantId: 0; scopes: string[]; grantType: 'client_credentials' };

export function signAccessToken(input: AccessTokenInput): string {
  const key = signingKey();
  return jwt.sign(
    {
      scope: input.scopes.join(' '),
      client_id: input.clientId,
      gid: input.grantId,
      ...(input.grantType === 'client_credentials' ? { grant_type: 'client_credentials' } : {}),
    },
    key.privatePem,
    {
      algorithm: 'RS256',
      header: { alg: 'RS256', typ: 'at+jwt', kid: key.kid },
      issuer: config('oidc.issuer'),
      audience: input.clientId,
      subject: input.subject ?? String(input.userId),
      expiresIn: config('oidc.accessTtl'),
      jwtid: randomToken(12),
    },
  );
}

export function signServiceToken(input: { clientId: string; scopes: string[] }): string {
  const key = signingKey();
  return jwt.sign(
    { scope: input.scopes.join(' '), client_id: input.clientId, token_use: 'service' },
    key.privatePem,
    {
      algorithm: 'RS256',
      header: { alg: 'RS256', typ: 'at+jwt', kid: key.kid },
      issuer: config('oidc.issuer'),
      audience: config('oidc.internalAudience'),
      subject: input.clientId,
      expiresIn: config('oidc.serviceTtl'),
      jwtid: randomToken(12),
    },
  );
}

export function signIdToken(input: {
  user: Pick<User, 'id' | 'fullname' | 'email' | 'phone' | 'isVerified' | 'accountType'>;
  clientId: string;
  scopes: string[];
  nonce: string | undefined;
  authTime: Date;
  accessToken: string;
}): string {
  const key = signingKey();
  const { sub, ...claims } = claimsFor(input.user, input.scopes);
  const atHash = createHash('sha256').update(input.accessToken).digest().subarray(0, 16).toString('base64url');

  return jwt.sign(
    {
      ...claims,
      auth_time: Math.floor(input.authTime.getTime() / 1000),
      at_hash: atHash,
      ...(input.nonce ? { nonce: input.nonce } : {}),
    },
    key.privatePem,
    {
      algorithm: 'RS256',
      header: { alg: 'RS256', typ: 'JWT', kid: key.kid },
      issuer: config('oidc.issuer'),
      audience: input.clientId,
      subject: sub,
      expiresIn: config('oidc.idTokenTtl'),
    },
  );
}

export function verifyAccessToken(token: string): AccessClaims | null {
  try {
    const decoded = jwt.decode(token, { complete: true });
    const kid = decoded && typeof decoded === 'object' && decoded.header && typeof decoded.header === 'object'
      ? (decoded.header as { kid?: unknown }).kid
      : undefined;
    const payload = jwt.verify(token, verificationKey(typeof kid === 'string' ? kid : undefined), {
      algorithms: ['RS256'],
      issuer: config('oidc.issuer'),
    });
    if (typeof payload === 'string') return null;

    const { sub } = payload;
    const gid = payload['gid'];
    const clientId = payload['client_id'];
    const exp = payload['exp'];
    const rawGrantType = payload['grant_type'];
    if (rawGrantType !== undefined && rawGrantType !== 'client_credentials') return null;
    const grantType = rawGrantType === 'client_credentials' ? 'client_credentials' : 'authorization_code';
    const aud = payload['aud'];
    if (
      typeof sub !== 'string' ||
      typeof gid !== 'number' ||
      !Number.isSafeInteger(gid) ||
      typeof clientId !== 'string' ||
      !clientId ||
      typeof exp !== 'number' ||
      !Number.isFinite(exp) ||
      aud !== clientId ||
      (grantType === 'client_credentials' && (gid !== 0 || sub !== clientId)) ||
      (grantType === 'authorization_code' && gid <= 0)
    ) return null;

    return {
      sub,
      clientId,
      gid,
      scopes: String(payload['scope'] ?? '').split(/\s+/).filter(Boolean),
      exp,
      grantType,
    };
  } catch {
    return null;
  }
}

export function verifyServiceToken(token: string): ServiceClaims | null {
  try {
    const decoded = jwt.decode(token, { complete: true });
    const header = decoded && typeof decoded === 'object' ? decoded.header : undefined;
    if (!header || header.typ !== 'at+jwt') return null;

    const kid = typeof header.kid === 'string' ? header.kid : undefined;
    const payload = jwt.verify(token, verificationKey(kid), {
      algorithms: ['RS256'],
      issuer: config('oidc.issuer'),
      audience: config('oidc.internalAudience'),
    });
    if (typeof payload === 'string' || payload['token_use'] !== 'service') return null;

    const clientId = payload['client_id'];
    const exp = payload['exp'];
    if (
      typeof clientId !== 'string' ||
      !clientId ||
      payload.sub !== clientId ||
      typeof exp !== 'number' ||
      !Number.isFinite(exp)
    ) return null;

    return {
      clientId,
      scopes: typeof payload['scope'] === 'string' ? payload['scope'].split(/\s+/).filter(Boolean) : [],
      exp,
    };
  } catch {
    return null;
  }
}
