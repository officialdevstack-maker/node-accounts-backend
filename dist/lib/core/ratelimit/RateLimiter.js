import { config } from '../config/index.js';
import { MemoryStore } from './MemoryStore.js';
export class RateLimiter {
    static store = new MemoryStore();
    static limiters = new Map();
    /** Swap the storage, e.g. RateLimiter.useStore(new RedisStore(...)) */
    static useStore(store) {
        this.store = store;
    }
    /** Register a named limiter. Return one Limit, or an array to enforce several at once. */
    static for(name, callback) {
        if (!/^[a-z][a-z0-9_-]*$/i.test(name))
            throw new Error(`"${name}" is not a valid limiter name (letters, numbers, "-" and "_").`);
        this.limiters.set(name, callback);
    }
    static limiter(name) {
        return this.limiters.get(name);
    }
    static names() {
        return [...this.limiters.keys()].sort();
    }
    /** Count one hit. The window (`decaySeconds`) starts on the first hit. Returns the hits so far. */
    static async hit(key, decaySeconds = 60) {
        return (await this.store.hit(this.k(key), decaySeconds)).count;
    }
    static async attempts(key) {
        return (await this.store.get(this.k(key)))?.count ?? 0;
    }
    static async tooManyAttempts(key, maxAttempts) {
        return (await this.attempts(key)) >= maxAttempts;
    }
    static async remaining(key, maxAttempts) {
        return Math.max(0, maxAttempts - (await this.attempts(key)));
    }
    /** Seconds until the window ends (0 when there is no active window). */
    static async availableIn(key) {
        const entry = await this.store.get(this.k(key));
        return entry ? Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000)) : 0;
    }
    static async clear(key) {
        await this.store.clear(this.k(key));
    }
    static async flush() {
        await this.store.flush();
    }
    /** Run `callback` unless the key is over its limit. Each run counts as one hit. */
    static async attempt(key, maxAttempts, callback, decaySeconds = 60) {
        if (await this.tooManyAttempts(key, maxAttempts)) {
            return { ok: false, retryAfter: await this.availableIn(key) };
        }
        await this.hit(key, decaySeconds);
        return { ok: true, value: await callback() };
    }
    static k(key) {
        return `${config('ratelimit.prefix')}:${key}`;
    }
}
//# sourceMappingURL=RateLimiter.js.map