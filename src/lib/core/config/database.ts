// config/database.ts (Laravel: config/database.php)
import { env } from './env.js';

const driver = env.oneOf('DB_CONNECTION', ['mysql', 'pgsql', 'sqlite'] as const, 'mysql');

export const databaseConfig = {
  default: driver,

  host: env.string('DB_HOST', '127.0.0.1'),
  port: env.number('DB_PORT', driver === 'pgsql' ? 5432 : 3306),
  name: env.string('DB_NAME', 'node_accounts'),
  username: env.string('DB_USERNAME', driver === 'pgsql' ? 'postgres' : 'root'),
  password: env.string('DB_PASSWORD', ''),
  /** Table that records which migrations have run (Laravel's `migrations` table) */
  migrationsTable: env.string('DB_MIGRATIONS_TABLE', 'migrations'),

  logging: env.bool('DB_LOGGING', false),
  /** MySQL only. Postgres uses timestamptz and SQLite stores UTC ISO strings. */
  timezone: env.string('DB_TIMEZONE', '+01:00'), // WAT
  ssl: {
    enabled: env.bool('DB_SSL', false),
    ca: env.string('DB_SSL_CA') || undefined,
    rejectUnauthorized: env.bool('DB_SSL_REJECT_UNAUTHORIZED', true),
  },

  sqlite: {
    path: env.string('DB_SQLITE_PATH', 'storage/database.sqlite'),
  },

  pool: {
    max: env.number('DB_POOL_MAX', 10),
    min: env.number('DB_POOL_MIN', 0),
    idleMs: env.number('DB_POOL_IDLE_MS', 10_000),
    acquireMs: env.number('DB_POOL_ACQUIRE_MS', 30_000),
  },
};
