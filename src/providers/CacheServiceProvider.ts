import { Redis } from 'ioredis';
import { ServiceProvider } from '../lib/core/boot/index.js';
import { Cache, MemoryStore, RedisStore } from '../lib/core/cache/index.js';
import { config } from '../lib/core/config/index.js';

export class CacheServiceProvider extends ServiceProvider {
  private redis?: Redis;

  register(): void {
    if (config('cache.store') !== 'redis') {
      Cache.useStore(new MemoryStore(config('cache.memoryMaxEntries')));
      return;
    }

    this.redis = new Redis(config('cache.redisUrl'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    Cache.useStore(new RedisStore(this.redis, `${config('cache.prefix')}:`));
  }

  async boot(): Promise<void> {
    await this.redis?.connect();
  }

  async shutdown(): Promise<void> {
    if (this.redis?.status === 'ready') await this.redis.quit();
    else this.redis?.disconnect();
  }
}
