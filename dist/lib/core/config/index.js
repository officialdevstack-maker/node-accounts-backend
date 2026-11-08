// config/index.ts
// Single entry point:  import { config } from './config/index.js';
//   config('app.name')                 -> 'Spurs'
//   config('mail.mailers.smtp.host')   -> typed + autocompleted
//   config('services.termii.apiKey', 'fallback')
//
// IMPORTANT: import this file (or anything that imports it) AFTER nothing else needs env,
// the dotenv import below runs first, so .env is always loaded before config is built.
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
/** Register every config file here. The key becomes the first segment: config('mail.from.address'). */
const repository = {
    app: appConfig,
    auth: authConfig,
    database: databaseConfig,
    mail: mailConfig,
    notifications: notificationsConfig,
    queue: queueConfig,
    ratelimit: ratelimitConfig,
    services: servicesConfig,
};
// ---- accessor ------------------------------------------------------------------------------
export class Config {
    /** Config.get('mail.from.address') */
    static get(path, fallback) {
        let current = repository;
        for (const segment of path.split('.')) {
            if (current === null || typeof current !== 'object' || !(segment in current)) {
                return fallback;
            }
            current = current[segment];
        }
        return (current === undefined ? fallback : current);
    }
    static has(path) {
        return this.get(path, Symbol.for('missing')) !== Symbol.for('missing');
    }
    /** Override a value at runtime, mainly for tests: Config.set('mail.default', 'log') */
    static set(path, value) {
        const segments = path.split('.');
        const last = segments.pop();
        let current = repository;
        for (const segment of segments) {
            const next = current[segment];
            if (next === null || typeof next !== 'object') {
                throw new Error(`Cannot set config [${path}]: [${segment}] is not an object.`);
            }
            current = next;
        }
        current[last] = value;
    }
    /** Whole config tree (read-only view). */
    static all() {
        return repository;
    }
}
/** Laravel-style helper: config('app.name') */
export function config(path, fallback) {
    return Config.get(path, fallback);
}
export { appConfig, authConfig, databaseConfig, mailConfig, notificationsConfig, queueConfig, ratelimitConfig, servicesConfig };
//# sourceMappingURL=index.js.map