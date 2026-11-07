export interface RateLimitEntry {
  /** Hits inside the current window */
  count: number;
  /** When the window ends (ms since epoch) */
  resetAt: number;
}

/** Where counters live. MemoryStore is the default; write a Redis one later and call RateLimiter.useStore(...). */
export interface RateLimitStore {
  /** Add one hit. Starts a new window of `decaySeconds` when none is active. Must be atomic. */
  hit(key: string, decaySeconds: number): Promise<RateLimitEntry>;
  get(key: string): Promise<RateLimitEntry | undefined>;
  clear(key: string): Promise<void>;
  flush(): Promise<void>;
}
