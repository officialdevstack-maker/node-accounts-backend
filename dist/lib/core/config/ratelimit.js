import { env } from './env.js';
export const ratelimitConfig = {
    /** Set RATE_LIMIT_ENABLED=false to switch every throttle middleware off (handy for tests) */
    enabled: env.bool('RATE_LIMIT_ENABLED', true),
    /** Prefix for every counter key (matters when several apps share one Redis) */
    prefix: env.string('RATE_LIMIT_PREFIX', 'rl'),
};
//# sourceMappingURL=ratelimit.js.map