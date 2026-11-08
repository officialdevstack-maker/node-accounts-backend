import type { RateLimitEntry, RateLimitStore } from './types.js';
export declare class MemoryStore implements RateLimitStore {
    private readonly entries;
    hit(key: string, decaySeconds: number): Promise<RateLimitEntry>;
    get(key: string): Promise<RateLimitEntry | undefined>;
    clear(key: string): Promise<void>;
    flush(): Promise<void>;
    /** Drop expired entries now and then so the map cannot grow forever. */
    private sweep;
}
//# sourceMappingURL=MemoryStore.d.ts.map