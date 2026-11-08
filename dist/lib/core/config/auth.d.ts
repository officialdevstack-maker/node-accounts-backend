export declare const authConfig: {
    jwt: {
        secret: string;
        accessTtl: string;
        refreshTtl: string;
        issuer: string;
    };
    bcryptRounds: number;
    otp: {
        length: number;
        ttlMinutes: number;
        maxAttempts: number;
    };
    tokens: {
        shortHours: number;
        rememberDays: number;
    };
    passwordResetTtlMinutes: number;
};
//# sourceMappingURL=auth.d.ts.map