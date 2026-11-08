import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import HttpError from '../../error.js';
import { config } from '../config/index.js';

export interface SignedUrlOptions {
  expiresIn?: number;
}

export class UrlSigner {
  private static secret(): string {
    const secret = config('auth.jwt.secret') || config('app.key');
    if (!secret) throw new Error('URL signing requires auth.jwt.secret or app.key to be configured.');
    return secret;
  }

  private static signature(url: URL): string {
    const unsigned = new URL(url);
    unsigned.searchParams.delete('signature');
    return createHmac('sha256', this.secret()).update(unsigned.toString()).digest('hex');
  }

  static sign(url: string, options: SignedUrlOptions = {}): string {
    const target = new URL(url, config('app.url'));
    if (options.expiresIn !== undefined) {
      if (!Number.isFinite(options.expiresIn) || options.expiresIn <= 0) {
        throw new Error('Signed URL expiresIn must be a positive number of seconds.');
      }
      target.searchParams.set('expires', String(Math.floor(Date.now() / 1000) + Math.floor(options.expiresIn)));
    }

    target.searchParams.delete('signature');
    target.searchParams.set('signature', this.signature(target));
    return target.toString();
  }

  static verify(url: string | URL): boolean {
    const target = new URL(url, config('app.url'));
    const signatures = target.searchParams.getAll('signature');
    if (signatures.length !== 1 || !/^[a-f\d]{64}$/i.test(signatures[0] ?? '')) return false;

    const expirations = target.searchParams.getAll('expires');
    if (
      expirations.length > 1 ||
      (expirations.length === 1 &&
        (!/^\d+$/.test(expirations[0] ?? '') || Number(expirations[0]) <= Math.floor(Date.now() / 1000)))
    ) {
      return false;
    }

    const supplied = Buffer.from(signatures[0]!, 'hex');
    const expected = Buffer.from(this.signature(target), 'hex');
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  }

  static middleware(): RequestHandler {
    return (req, _res, next) => {
      try {
        if (!this.verify(new URL(req.originalUrl, config('app.url')))) {
          return next(HttpError.forbidden('Invalid or expired signed URL.'));
        }
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}
