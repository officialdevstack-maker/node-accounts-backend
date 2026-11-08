export class Limit {
    maxAttempts;
    decaySeconds;
    /** Separates counters, e.g. per user or per email. Empty means "per IP". */
    key = '';
    message;
    constructor(maxAttempts, decaySeconds) {
        this.maxAttempts = maxAttempts;
        this.decaySeconds = decaySeconds;
        if (Number.isFinite(maxAttempts) && (!Number.isInteger(maxAttempts) || maxAttempts < 1)) {
            throw new Error('Limit: max attempts must be a whole number of 1 or more.');
        }
        if (!(decaySeconds > 0))
            throw new Error('Limit: the window must be greater than 0 seconds.');
    }
    static perSecond(maxAttempts) {
        return new Limit(maxAttempts, 1);
    }
    /** Limit.perMinute(5) = 5 per minute · Limit.perMinute(5, 15) = 5 per 15 minutes */
    static perMinute(maxAttempts, minutes = 1) {
        return new Limit(maxAttempts, Math.round(minutes * 60));
    }
    static perHour(maxAttempts, hours = 1) {
        return new Limit(maxAttempts, Math.round(hours * 3600));
    }
    static perDay(maxAttempts, days = 1) {
        return new Limit(maxAttempts, Math.round(days * 86400));
    }
    /** No limit (for example admins). */
    static none() {
        return new Limit(Number.POSITIVE_INFINITY, 60);
    }
    /** Count per this value instead of per IP: .by(req.user?.id) · .by(req.body.email) */
    by(key) {
        this.key = key === null || key === undefined ? '' : String(key);
        return this;
    }
    withMessage(message) {
        this.message = message;
        return this;
    }
    /** '5/minute', '100/hour', '5 per 900s' (used by limiter:list) */
    describe() {
        if (!Number.isFinite(this.maxAttempts))
            return 'unlimited';
        const units = { 1: 'second', 60: 'minute', 3600: 'hour', 86400: 'day' };
        const unit = units[this.decaySeconds];
        return unit ? `${this.maxAttempts}/${unit}` : `${this.maxAttempts} per ${this.decaySeconds}s`;
    }
}
//# sourceMappingURL=Limit.js.map