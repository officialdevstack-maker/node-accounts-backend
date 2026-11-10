import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import HttpError from '../lib/error.js';
import { config } from '../lib/core/config/index.js';

function matchesSecret(supplied: string | undefined, expected: string): boolean {
  if (!supplied) return false;
  const actualBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export function internalNetwork(req: Request, _res: Response, next: NextFunction): void {
  const allowedIps = config('services.internal.allowedIps');
  const sharedSecret = config('services.internal.sharedSecret');
  const ipAllowed = allowedIps.includes(req.ip ?? req.socket.remoteAddress ?? '');
  const secretAllowed = matchesSecret(req.get('x-internal-secret'), sharedSecret);

  if (!ipAllowed && !secretAllowed) return next(HttpError.forbidden('This endpoint is restricted to internal services.'));
  next();
}

export function internalKey(req: Request, _res: Response, next: NextFunction): void {
  const expected = config('services.internal.sharedSecret');
  if (!expected || !matchesSecret(req.get('x-internal-secret'), expected)) {
    return next(HttpError.forbidden('Invalid internal key.'));
  }
  next();
}
