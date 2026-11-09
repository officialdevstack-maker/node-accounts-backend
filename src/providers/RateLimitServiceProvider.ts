import { Redis } from 'ioredis';
import { config } from '../lib/core/config/index.js';
import { ServiceProvider } from '../lib/core/boot/index.js';
import { RateLimiter, RedisStore } from '../lib/core/ratelimit/index.js';

export class RateLimitServiceProvider extends ServiceProvider {
  private redis?: Redis;

  register(): void {
    if (config('ratelimit.store') !== 'redis') return;

    this.redis = new Redis(config('ratelimit.redisUrl'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    RateLimiter.useStore(new RedisStore(this.redis, `${config('ratelimit.prefix')}:`));
  }

  async boot(): Promise<void> {
    await this.redis?.connect();
  }

  async shutdown(): Promise<void> {
    if (this.redis?.status === 'ready') await this.redis.quit();
    else this.redis?.disconnect();
  }
}
