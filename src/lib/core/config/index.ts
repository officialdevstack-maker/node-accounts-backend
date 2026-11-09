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
import { oidcConfig } from './oidc.js';
import { queueConfig } from './queue.js';
import { ratelimitConfig } from './ratelimit.js';
import { servicesConfig } from './services.js';
import { storageConfig } from './storage.js';

export { env } from './env.js';
export type { MailerName } from './mail.js';

/** Register every config file here. The key becomes the first segment: config('mail.from.address'). */
const repository = {
  app: appConfig,
  auth: authConfig,
  database: databaseConfig,
  mail: mailConfig,
  notifications: notificationsConfig,
  oidc: oidcConfig,
  queue: queueConfig,
  ratelimit: ratelimitConfig,
  services: servicesConfig,
  storage: storageConfig,
};

export type ConfigRepository = typeof repository;

// ---- typed dot-notation paths --------------------------------------------------------------

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type Paths<T> = T extends Primitive | readonly unknown[] | ((...args: never[]) => unknown)
  ? never
  : { [K in keyof T & string]: T[K] extends Primitive | readonly unknown[] ? K : K | `${K}.${Paths<T[K]>}` }[keyof T & string];

type PathValue<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? PathValue<NonNullable<T[Head]>, Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

export type ConfigPath = Paths<ConfigRepository>;

// ---- accessor ------------------------------------------------------------------------------

export class Config {
  /** Config.get('mail.from.address') */
  static get<P extends ConfigPath>(path: P, fallback?: PathValue<ConfigRepository, P>): PathValue<ConfigRepository, P> {
    let current: unknown = repository;

    for (const segment of path.split('.')) {
      if (current === null || typeof current !== 'object' || !(segment in current)) {
        return fallback as PathValue<ConfigRepository, P>;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    return (current === undefined ? fallback : current) as PathValue<ConfigRepository, P>;
  }

  static has(path: ConfigPath): boolean {
    return this.get(path as never, Symbol.for('missing') as never) !== Symbol.for('missing');
  }

  /** Override a value at runtime, mainly for tests: Config.set('mail.default', 'log') */
  static set<P extends ConfigPath>(path: P, value: PathValue<ConfigRepository, P>): void {
    const segments = path.split('.');
    const last = segments.pop() as string;
    let current: Record<string, unknown> = repository;

    for (const segment of segments) {
      const next = current[segment];
      if (next === null || typeof next !== 'object') {
        throw new Error(`Cannot set config [${path}]: [${segment}] is not an object.`);
      }
      current = next as Record<string, unknown>;
    }

    current[last] = value;
  }

  /** Whole config tree (read-only view). */
  static all(): Readonly<ConfigRepository> {
    return repository;
  }
}

/** Laravel-style helper: config('app.name') */
export function config<P extends ConfigPath>(
  path: P,
  fallback?: PathValue<ConfigRepository, P>,
): PathValue<ConfigRepository, P> {
  return Config.get(path, fallback);
}

export { appConfig, authConfig, databaseConfig, mailConfig, notificationsConfig, oidcConfig, queueConfig, ratelimitConfig, servicesConfig, storageConfig };
