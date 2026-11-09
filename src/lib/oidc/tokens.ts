import jwt from 'jsonwebtoken';
import type { User } from '../../models/User.js';
import { config } from '../core/config/index.js';
import { claimsFor } from './claims.js';
import { signingKey } from './keys.js';
import { randomToken } from './util.js';

export interface AccessClaims {
  sub: string;
  clientId: string;
  gid: number;
  scopes: string[];
}

export function signAccessToken(input: { userId: number; clientId: string; grantId: number; scopes: string[] }): string {
  const key = signingKey();
  return jwt.sign(
    { scope: input.scopes.join(' '), client_id: input.clientId, gid: input.grantId },
    key.privatePem,
    {
      algorithm: 'RS256',
      header: { alg: 'RS256', typ: 'at+jwt', kid: key.kid },
      issuer: config('oidc.issuer'),
      audience: input.clientId,
      subject: String(input.userId),
      expiresIn: config('oidc.accessTtl'),
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
}): string {
  const key = signingKey();
  const { sub, ...claims } = claimsFor(input.user, input.scopes);

  return jwt.sign(
    {
      ...claims,
      auth_time: Math.floor(input.authTime.getTime() / 1000),
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
    const payload = jwt.verify(token, signingKey().publicPem, {
      algorithms: ['RS256'],
      issuer: config('oidc.issuer'),
    });
    if (typeof payload === 'string') return null;

    const { sub } = payload;
    const gid = payload['gid'];
    const clientId = payload['client_id'];
    if (typeof sub !== 'string' || typeof gid !== 'number' || typeof clientId !== 'string') return null;

    return { sub, clientId, gid, scopes: String(payload['scope'] ?? '').split(' ').filter(Boolean) };
  } catch {
    return null;
  }
}
