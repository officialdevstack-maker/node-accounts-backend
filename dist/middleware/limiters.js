import { Limit, RateLimiter } from '../lib/core/ratelimit/index.js';
RateLimiter.for('api', (req) => Limit.perMinute(120).by(req.ip));
RateLimiter.for('auth', (req) => [
    Limit.perMinute(20).by(req.ip),
    Limit.perMinute(5).by(req.body?.email),
]);
export {};
//# sourceMappingURL=limiters.js.map