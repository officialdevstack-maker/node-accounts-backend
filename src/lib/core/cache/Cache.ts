import { config } from '../config/index.js';
import { MemoryStore } from './MemoryStore.js';
import type { CacheStore } from './types.js';

export class Cache {
  private static store: CacheStore = new MemoryStore(config('cache.memoryMaxEntries'));
  /** Concurrent misses for the same key share one computation (no stampede). */
  private static inflight = new Map<string, Promise<unknown>>();

  /** Swap the storage, e.g. Cache.useStore(new RedisStore(...)) */
  static useStore(store: CacheStore): void {
    this.store = store;
  }

  /** Cache.get<T>('key') -> value, or undefined on a miss. Cache failures never throw. */
  static async get<T>(key: string): Promise<T | undefined> {
    if (!config('cache.enabled')) return undefined;
    try {
      const raw = await this.store.get(this.k(key));
      return raw === undefined ? undefined : (JSON.parse(raw) as T);
    } catch (error) {
      console.error('[cache] get failed', key, error);
      return undefined;
    }
  }

  static async put(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!config('cache.enabled') || value === undefined) return;
    try {
      await this.store.put(this.k(key), JSON.stringify(value), ttlSeconds);
    } catch (error) {
      console.error('[cache] put failed', key, error);
    }
  }

  static async forget(...keys: string[]): Promise<void> {
    try {
      await Promise.all(keys.map((key) => this.store.forget(this.k(key))));
    } catch (error) {
      console.error('[cache] forget failed', keys, error);
    }
  }

  static async flush(): Promise<void> {
    try {
      await this.store.flush();
    } catch (error) {
      console.error('[cache] flush failed', error);
    }
  }

  /**
   * Return the cached value, or run `compute`, cache its result for `ttlSeconds`, and return it.
   * Values pass through JSON, so Dates come back as ISO strings: cache plain data, not models.
   */
  static async remember<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    if (!config('cache.enabled')) return compute();

    const hit = await this.get<T>(key);
    if (hit !== undefined) return hit;

    const pending = this.inflight.get(key) as Promise<T> | undefined;
    if (pending) return pending;

    const run = (async () => {
      const value = await compute();
      await this.put(key, value, ttlSeconds);
      return value;
    })().finally(() => this.inflight.delete(key));

    this.inflight.set(key, run);
    return run;
  }

  private static k(key: string): string {
    return `${config('cache.prefix')}:${key}`;
  }
}
