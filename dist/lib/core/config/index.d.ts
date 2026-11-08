import 'dotenv/config';
import { appConfig } from './app.js';
import { authConfig } from './auth.js';
import { databaseConfig } from './database.js';
import { mailConfig } from './mail.js';
import { notificationsConfig } from './notifications.js';
import { queueConfig } from './queue.js';
import { ratelimitConfig } from './ratelimit.js';
import { servicesConfig } from './services.js';
export { env } from './env.js';
export type { MailerName } from './mail.js';
/** Register every config file here. The key becomes the first segment: config('mail.from.address'). */
declare const repository: {
    app: {
        name: string;
        env: "development" | "test" | "production";
        debug: boolean;
        url: string;
        port: number;
        timezone: string;
        currency: string;
        corsOrigins: string[];
    };
    auth: {
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
    database: {
        default: "mysql";
        host: string;
        port: number;
        name: string;
        username: string;
        password: string;
        migrationsTable: string;
        logging: boolean;
        timezone: string;
        pool: {
            max: number;
            min: number;
            idleMs: number;
            acquireMs: number;
        };
    };
    mail: {
        default: import("./mail.js").MailerName;
        mailers: {
            smtp: {
                host: string;
                port: number;
                secure: boolean;
                auth: {
                    user: string;
                    pass: string;
                } | undefined;
            };
            log: {};
        };
        from: {
            address: string;
            name: string;
        };
        queue: {
            tries: number;
            backoffMs: number;
        };
        app: {
            name: string;
            url: string;
            supportEmail: string;
        };
    };
    notifications: {
        defaultChannels: string[];
        sms: {
            driver: "log" | "termii";
            senderId: string;
        };
        database: {
            table: string;
            inboxLimit: number;
        };
    };
    queue: {
        driver: "memory" | "redis";
        tries: number;
        backoffMs: number;
        redis: {
            host: string;
            port: number;
            password: string | undefined;
        };
    };
    ratelimit: {
        enabled: boolean;
        prefix: string;
    };
    services: {
        termii: {
            apiKey: string;
            baseUrl: string;
            channel: "generic" | "dnd" | "whatsapp";
        };
        paystack: {
            publicKey: string;
            secretKey: string;
            webhookSecret: string;
            baseUrl: string;
        };
        flutterwave: {
            publicKey: string;
            secretKey: string;
            webhookHash: string;
            baseUrl: string;
        };
    };
};
export type ConfigRepository = typeof repository;
type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type Paths<T> = T extends Primitive | readonly unknown[] | ((...args: never[]) => unknown) ? never : {
    [K in keyof T & string]: T[K] extends Primitive | readonly unknown[] ? K : K | `${K}.${Paths<T[K]>}`;
}[keyof T & string];
type PathValue<T, P extends string> = P extends `${infer Head}.${infer Rest}` ? Head extends keyof T ? PathValue<NonNullable<T[Head]>, Rest> : never : P extends keyof T ? T[P] : never;
export type ConfigPath = Paths<ConfigRepository>;
export declare class Config {
    /** Config.get('mail.from.address') */
    static get<P extends ConfigPath>(path: P, fallback?: PathValue<ConfigRepository, P>): PathValue<ConfigRepository, P>;
    static has(path: ConfigPath): boolean;
    /** Override a value at runtime, mainly for tests: Config.set('mail.default', 'log') */
    static set<P extends ConfigPath>(path: P, value: PathValue<ConfigRepository, P>): void;
    /** Whole config tree (read-only view). */
    static all(): Readonly<ConfigRepository>;
}
/** Laravel-style helper: config('app.name') */
export declare function config<P extends ConfigPath>(path: P, fallback?: PathValue<ConfigRepository, P>): PathValue<ConfigRepository, P>;
export { appConfig, authConfig, databaseConfig, mailConfig, notificationsConfig, queueConfig, ratelimitConfig, servicesConfig };
//# sourceMappingURL=index.d.ts.map