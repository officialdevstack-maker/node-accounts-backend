export declare const env: {
    /** env.string('APP_NAME', 'Spurs') */
    string(key: string, fallback?: string): string;
    /** env.number('PORT', 3000). Throws on garbage like PORT=abc instead of silently using NaN. */
    number(key: string, fallback: number): number;
    /** env.bool('APP_DEBUG', false). Accepts true/false, 1/0, yes/no, on/off. */
    bool(key: string, fallback?: boolean): boolean;
    /** env.list('CORS_ORIGINS', []) -> "a.com, b.com" becomes ['a.com', 'b.com'] */
    list(key: string, fallback?: string[]): string[];
    /** env.oneOf('MAIL_MAILER', ['smtp', 'log'], 'smtp'). Fails fast on typos. */
    oneOf<T extends string>(key: string, allowed: readonly T[], fallback: T): T;
    /** env.required('JWT_SECRET'). Throws at boot if missing. */
    required(key: string): string;
};
//# sourceMappingURL=env.d.ts.map