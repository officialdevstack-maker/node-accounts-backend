import type { Redis } from 'ioredis';
import type { RateLimitEntry, RateLimitStore } from './types.js';

const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return { count, redis.call('PTTL', KEYS[1]) }
`;

export class RedisStore implements RateLimitStore {
  constructor(
    private readonly redis: Redis,
    private readonly keyPrefix: string,
  ) {}

  async hit(key: string, decaySeconds: number): Promise<RateLimitEntry> {
    const result = await this.redis.eval(HIT_SCRIPT, 1, key, String(decaySeconds * 1000)) as [number, number];
    return { count: Number(result[0]), resetAt: Date.now() + Number(result[1]) };
  }

  async get(key: string): Promise<RateLimitEntry | undefined> {
    const [value, ttl] = await Promise.all([this.redis.get(key), this.redis.pttl(key)]);
    if (value === null || ttl < 0) return undefined;
    return { count: Number(value), resetAt: Date.now() + ttl };
  }

  async clear(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async flush(): Promise<void> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', `${this.keyPrefix}*`, 'COUNT', 500);
      if (keys.length) await this.redis.del(...keys);
      cursor = nextCursor;
    } while (cursor !== '0');
  }
}
