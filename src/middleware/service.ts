import type { NextFunction, Request, Response } from 'express';
import HttpError from '../lib/error.js';
import { config } from '../lib/core/config/index.js';
import { verifyServiceToken } from '../lib/oidc/tokens.js';
import { OAuthClient } from '../models/OAuthClient.js';

export const serviceAuth = (...required: string[]) => async (req: Request, _res: Response, next: NextFunction) => {
  const match = req.headers.authorization?.match(/^Bearer\s+(.+)$/i);
  const claims = match ? verifyServiceToken(match[1]!.trim()) : null;
  if (!claims) return next(HttpError.unauthorized('Invalid or expired service token.'));

  const client = await OAuthClient.findByClientId(claims.clientId);
  if (
    !client?.isActive ||
    !client.clientCredentialsEnabled ||
    !client.isFirstParty() ||
    claims.scopes.some((scope) =>
      !client.allowedScopes.includes(scope) || !config('oidc.serviceScopes').includes(scope),
    )
  ) return next(HttpError.unauthorized('Invalid or expired service token.'));

  const missing = required.filter((scope) => !claims.scopes.includes(scope));
  if (missing.length) return next(HttpError.forbidden(`Missing scope: ${missing.join(', ')}`));

  req.service = claims;
  next();
};
