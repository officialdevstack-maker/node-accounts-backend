// config/env.ts
// Typed helpers for reading environment variables (Laravel's env()).
// Empty strings count as "not set", so `MAIL_USERNAME=` falls back to the default.
function raw(key) {
    const value = process.env[key];
    return value === undefined || value.trim() === '' ? undefined : value.trim();
}
export const env = {
    /** env.string('APP_NAME', 'Spurs') */
    string(key, fallback = '') {
        return raw(key) ?? fallback;
    },
    /** env.number('PORT', 3000). Throws on garbage like PORT=abc instead of silently using NaN. */
    number(key, fallback) {
        const value = raw(key);
        if (value === undefined)
            return fallback;
        const parsed = Number(value);
        if (Number.isNaN(parsed))
            throw new Error(`Environment variable [${key}] must be a number, got "${value}".`);
        return parsed;
    },
    /** env.bool('APP_DEBUG', false). Accepts true/false, 1/0, yes/no, on/off. */
    bool(key, fallback = false) {
        const value = raw(key)?.toLowerCase();
        if (value === undefined)
            return fallback;
        if (['true', '1', 'yes', 'on'].includes(value))
            return true;
        if (['false', '0', 'no', 'off'].includes(value))
            return false;
        throw new Error(`Environment variable [${key}] must be a boolean, got "${value}".`);
    },
    /** env.list('CORS_ORIGINS', []) -> "a.com, b.com" becomes ['a.com', 'b.com'] */
    list(key, fallback = []) {
        const value = raw(key);
        return value === undefined ? fallback : value.split(',').map((v) => v.trim()).filter(Boolean);
    },
    /** env.oneOf('MAIL_MAILER', ['smtp', 'log'], 'smtp'). Fails fast on typos. */
    oneOf(key, allowed, fallback) {
        const value = raw(key);
        if (value === undefined)
            return fallback;
        if (!allowed.includes(value)) {
            throw new Error(`Environment variable [${key}] must be one of: ${allowed.join(', ')}. Got "${value}".`);
        }
        return value;
    },
    /** env.required('JWT_SECRET'). Throws at boot if missing. */
    required(key) {
        const value = raw(key);
        if (value === undefined)
            throw new Error(`Missing required environment variable [${key}].`);
        return value;
    },
};
//# sourceMappingURL=env.js.map