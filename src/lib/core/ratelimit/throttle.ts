import type { Request, RequestHandler } from 'express';
import HttpError from '../../error.js';
import { config } from '../config/index.js';
import type { Limit } from './Limit.js';
import { Limit as LimitClass } from './Limit.js';
import { RateLimiter } from './RateLimiter.js';

let instances = 0;

async function limitsFor(name: string, req: Request): Promise<Limit[]> {
  const callback = RateLimiter.limiter(name);
  if (!callback) throw new Error(`Rate limiter [${name}] is not defined. Register it with RateLimiter.for('${name}', ...).`);
  return [await callback(req)].flat();
}

/**
 * throttle(10, 1)      at most 10 requests per minute per IP, counted separately for every route that uses it
 * throttle('api')      uses the limiter registered with RateLimiter.for('api', ...)
 */
export function throttle(limiter: number | string = 60, decayMinutes = 1): RequestHandler {
  const fixed =
    typeof limiter === 'number' ? [new LimitClass(limiter, Math.round(decayMinutes * 60))] : undefined;

  const name = typeof limiter === 'string' ? limiter : `route${++instances}`;

  return async (req, res, next) => {
    try {
      if (!config('ratelimit.enabled')) return next();

      const limits = fixed ?? (await limitsFor(name, req));
      let worst: { limit: Limit; key: string; remaining: number; blocked: boolean } | undefined;

      for (const [index, limit] of limits.entries()) {
        if (!Number.isFinite(limit.maxAttempts)) continue;

        const key = `${name}:${index}:${limit.key || req.ip || 'unknown'}`;
        const count = await RateLimiter.hit(key, limit.decaySeconds);
        const current = { limit, key, remaining: Math.max(0, limit.maxAttempts - count), blocked: count > limit.maxAttempts };

        if (!worst || (current.blocked && !worst.blocked) || (current.blocked === worst.blocked && current.remaining < worst.remaining)) {
          worst = current;
        }
      }

      if (!worst) return next();

      res.setHeader('X-RateLimit-Limit', String(worst.limit.maxAttempts));
      res.setHeader('X-RateLimit-Remaining', String(worst.remaining));

      if (worst.blocked) {
        res.setHeader('Retry-After', String(await RateLimiter.availableIn(worst.key)));
        return next(new HttpError(429, worst.limit.message ?? 'Too many requests. Please try again later.'));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
