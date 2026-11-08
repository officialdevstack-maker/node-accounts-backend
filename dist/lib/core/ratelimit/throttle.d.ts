import type { RequestHandler } from 'express';
/**
 * throttle(10, 1)      at most 10 requests per minute per IP, counted separately for every route that uses it
 * throttle('api')      uses the limiter registered with RateLimiter.for('api', ...)
 */
export declare function throttle(limiter?: number | string, decayMinutes?: number): RequestHandler;
//# sourceMappingURL=throttle.d.ts.map