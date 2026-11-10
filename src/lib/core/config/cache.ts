import { env } from './env.js';

const redisUrl = env.string('REDIS_URL');
const store = env.oneOf('CACHE_STORE', ['memory', 'redis'] as const, redisUrl ? 'redis' : 'memory');

if (store === 'redis' && !redisUrl) {
  throw new Error('REDIS_URL is required when CACHE_STORE=redis.');
}

export const cacheConfig = {
  /** Set CACHE_ENABLED=false to bypass the cache entirely (handy for debugging). */
  enabled: env.bool('CACHE_ENABLED', true),
  store,
  redisUrl,
  /** Prefix for every key (matters when several apps share one Redis) */
  prefix: env.string('CACHE_PREFIX', 'cache'),
  /** Memory store only: evicts the oldest entries beyond this */
  memoryMaxEntries: env.number('CACHE_MEMORY_MAX_ENTRIES', 5000),
};
