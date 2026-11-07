import type { RateLimitEntry, RateLimitStore } from './types.js';

const SWEEP_AT = 5000;

export class MemoryStore implements RateLimitStore {
  private readonly entries = new Map<string, RateLimitEntry>();

  async hit(key: string, decaySeconds: number): Promise<RateLimitEntry> {
    const now = Date.now();
    this.sweep(now);

    let entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + decaySeconds * 1000 };
      this.entries.set(key, entry);
    }
    entry.count++;

    return { ...entry };
  }

  async get(key: string): Promise<RateLimitEntry | undefined> {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (entry.resetAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return { ...entry };
  }

  async clear(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async flush(): Promise<void> {
    this.entries.clear();
  }

  /** Drop expired entries now and then so the map cannot grow forever. */
  private sweep(now: number): void {
    if (this.entries.size < SWEEP_AT) return;
    for (const [key, entry] of this.entries) if (entry.resetAt <= now) this.entries.delete(key);
  }
}
