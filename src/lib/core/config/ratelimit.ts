import { env } from './env.js';

const redisUrl = env.string('REDIS_URL');
const store = env.oneOf('RATE_LIMIT_STORE', ['memory', 'redis'] as const, redisUrl ? 'redis' : 'memory');

if (store === 'redis' && !redisUrl) {
  throw new Error('REDIS_URL is required when RATE_LIMIT_STORE=redis.');
}

export const ratelimitConfig = {
  /** Set RATE_LIMIT_ENABLED=false to switch every throttle middleware off (handy for tests) */
  enabled: env.bool('RATE_LIMIT_ENABLED', true),
  /** Prefix for every counter key (matters when several apps share one Redis) */
  prefix: env.string('RATE_LIMIT_PREFIX', 'rl'),
  store,
  redisUrl,
};
