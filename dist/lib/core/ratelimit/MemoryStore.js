const SWEEP_AT = 5000;
export class MemoryStore {
    entries = new Map();
    async hit(key, decaySeconds) {
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
    async get(key) {
        const entry = this.entries.get(key);
        if (!entry)
            return undefined;
        if (entry.resetAt <= Date.now()) {
            this.entries.delete(key);
            return undefined;
        }
        return { ...entry };
    }
    async clear(key) {
        this.entries.delete(key);
    }
    async flush() {
        this.entries.clear();
    }
    /** Drop expired entries now and then so the map cannot grow forever. */
    sweep(now) {
        if (this.entries.size < SWEEP_AT)
            return;
        for (const [key, entry] of this.entries)
            if (entry.resetAt <= now)
                this.entries.delete(key);
    }
}
//# sourceMappingURL=MemoryStore.js.map