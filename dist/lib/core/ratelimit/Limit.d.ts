export declare class Limit {
    readonly maxAttempts: number;
    readonly decaySeconds: number;
    /** Separates counters, e.g. per user or per email. Empty means "per IP". */
    key: string;
    message?: string;
    constructor(maxAttempts: number, decaySeconds: number);
    static perSecond(maxAttempts: number): Limit;
    /** Limit.perMinute(5) = 5 per minute · Limit.perMinute(5, 15) = 5 per 15 minutes */
    static perMinute(maxAttempts: number, minutes?: number): Limit;
    static perHour(maxAttempts: number, hours?: number): Limit;
    static perDay(maxAttempts: number, days?: number): Limit;
    /** No limit (for example admins). */
    static none(): Limit;
    /** Count per this value instead of per IP: .by(req.user?.id) · .by(req.body.email) */
    by(key: string | number | null | undefined): this;
    withMessage(message: string): this;
    /** '5/minute', '100/hour', '5 per 900s' (used by limiter:list) */
    describe(): string;
}
//# sourceMappingURL=Limit.d.ts.map