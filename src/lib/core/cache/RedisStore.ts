import type { Redis } from 'ioredis';
import type { CacheStore } from './types.js';

export class RedisStore implements CacheStore {
  constructor(
    private readonly redis: Redis,
    private readonly keyPrefix: string,
  ) {}

  async get(key: string): Promise<string | undefined> {
    return (await this.redis.get(key)) ?? undefined;
  }

  async put(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, 'EX', Math.max(1, Math.round(ttlSeconds)));
  }

  async forget(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async flush(): Promise<void> {
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', `${this.keyPrefix}*`, 'COUNT', 500);
      if (keys.length) await this.redis.del(...keys);
      cursor = next;
    } while (cursor !== '0');
  }
}
