import type { Request } from 'express';
import { config } from '../config/index.js';
import type { Limit } from './Limit.js';
import { MemoryStore } from './MemoryStore.js';
import type { RateLimitStore } from './types.js';

export type LimiterCallback = (req: Request) => Limit | Limit[] | Promise<Limit | Limit[]>;

export type AttemptResult<T> = { ok: true; value: T } | { ok: false; retryAfter: number };

export class RateLimiter {
  private static store: RateLimitStore = new MemoryStore();
  private static limiters = new Map<string, LimiterCallback>();

  /** Swap the storage, e.g. RateLimiter.useStore(new RedisStore(...)) */
  static useStore(store: RateLimitStore): void {
    this.store = store;
  }

  /** Register a named limiter. Return one Limit, or an array to enforce several at once. */
  static for(name: string, callback: LimiterCallback): void {
    if (!/^[a-z][a-z0-9_-]*$/i.test(name)) throw new Error(`"${name}" is not a valid limiter name (letters, numbers, "-" and "_").`);
    this.limiters.set(name, callback);
  }

  static limiter(name: string): LimiterCallback | undefined {
    return this.limiters.get(name);
  }

  static names(): string[] {
    return [...this.limiters.keys()].sort();
  }

  /** Count one hit. The window (`decaySeconds`) starts on the first hit. Returns the hits so far. */
  static async hit(key: string, decaySeconds = 60): Promise<number> {
    return (await this.store.hit(this.k(key), decaySeconds)).count;
  }

  static async attempts(key: string): Promise<number> {
    return (await this.store.get(this.k(key)))?.count ?? 0;
  }

  static async tooManyAttempts(key: string, maxAttempts: number): Promise<boolean> {
    return (await this.attempts(key)) >= maxAttempts;
  }

  static async remaining(key: string, maxAttempts: number): Promise<number> {
    return Math.max(0, maxAttempts - (await this.attempts(key)));
  }

  /** Seconds until the window ends (0 when there is no active window). */
  static async availableIn(key: string): Promise<number> {
    const entry = await this.store.get(this.k(key));
    return entry ? Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000)) : 0;
  }

  static async clear(key: string): Promise<void> {
    await this.store.clear(this.k(key));
  }

  static async flush(): Promise<void> {
    await this.store.flush();
  }

  /** Run `callback` unless the key is over its limit. Each run counts as one hit. */
  static async attempt<T>(
    key: string,
    maxAttempts: number,
    callback: () => T | Promise<T>,
    decaySeconds = 60,
  ): Promise<AttemptResult<T>> {
    if (await this.tooManyAttempts(key, maxAttempts)) {
      return { ok: false, retryAfter: await this.availableIn(key) };
    }

    await this.hit(key, decaySeconds);
    return { ok: true, value: await callback() };
  }

  private static k(key: string): string {
    return `${config('ratelimit.prefix')}:${key}`;
  }
}
