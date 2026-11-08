import type { Request } from 'express';
import type { Limit } from './Limit.js';
import type { RateLimitStore } from './types.js';
export type LimiterCallback = (req: Request) => Limit | Limit[] | Promise<Limit | Limit[]>;
export type AttemptResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    retryAfter: number;
};
export declare class RateLimiter {
    private static store;
    private static limiters;
    /** Swap the storage, e.g. RateLimiter.useStore(new RedisStore(...)) */
    static useStore(store: RateLimitStore): void;
    /** Register a named limiter. Return one Limit, or an array to enforce several at once. */
    static for(name: string, callback: LimiterCallback): void;
    static limiter(name: string): LimiterCallback | undefined;
    static names(): string[];
    /** Count one hit. The window (`decaySeconds`) starts on the first hit. Returns the hits so far. */
    static hit(key: string, decaySeconds?: number): Promise<number>;
    static attempts(key: string): Promise<number>;
    static tooManyAttempts(key: string, maxAttempts: number): Promise<boolean>;
    static remaining(key: string, maxAttempts: number): Promise<number>;
    /** Seconds until the window ends (0 when there is no active window). */
    static availableIn(key: string): Promise<number>;
    static clear(key: string): Promise<void>;
    static flush(): Promise<void>;
    /** Run `callback` unless the key is over its limit. Each run counts as one hit. */
    static attempt<T>(key: string, maxAttempts: number, callback: () => T | Promise<T>, decaySeconds?: number): Promise<AttemptResult<T>>;
    private static k;
}
//# sourceMappingURL=RateLimiter.d.ts.map