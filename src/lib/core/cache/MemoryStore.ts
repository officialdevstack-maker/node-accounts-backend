import type { CacheStore } from './types.js';

type Entry = { value: string; expiresAt: number };

export class MemoryStore implements CacheStore {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly maxEntries = 5000) {}

  async get(key: string): Promise<string | undefined> {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async put(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.entries.delete(key); // re-insert so the Map keeps oldest-first order
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });

    if (this.entries.size > this.maxEntries) {
      const now = Date.now();
      for (const [k, e] of this.entries) if (e.expiresAt <= now) this.entries.delete(k);
      while (this.entries.size > this.maxEntries) {
        const oldest = this.entries.keys().next().value;
        if (oldest === undefined) break;
        this.entries.delete(oldest);
      }
    }
  }

  async forget(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async flush(): Promise<void> {
    this.entries.clear();
  }
}
