// config/database.ts (Laravel: config/database.php)
import { env } from './env.js';

export const databaseConfig = {
  default: env.oneOf('DB_CONNECTION', ['mysql'] as const, 'mysql'),

  host: env.string('DB_HOST', '127.0.0.1'),
  port: env.number('DB_PORT', 3306),
  name: env.string('DB_DATABASE', 'spurs'),
  username: env.string('DB_USERNAME', 'root'),
  password: env.string('DB_PASSWORD', ''),
  /** Table that records which migrations have run (Laravel's `migrations` table) */
  migrationsTable: env.string('DB_MIGRATIONS_TABLE', 'migrations'),

  logging: env.bool('DB_LOGGING', false),
  timezone: env.string('DB_TIMEZONE', '+01:00'), // WAT

  pool: {
    max: env.number('DB_POOL_MAX', 10),
    min: env.number('DB_POOL_MIN', 0),
    idleMs: env.number('DB_POOL_IDLE_MS', 10_000),
    acquireMs: env.number('DB_POOL_ACQUIRE_MS', 30_000),
  },
};
