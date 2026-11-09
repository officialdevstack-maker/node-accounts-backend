import { config } from '../config/index.js';
import { Connection } from '../query/Connection.js';
import type { DatabaseDriver } from '../query/drivers/types.js';
import { createMySqlDriver } from './drivers/MySqlDriver.js';
import { createPostgresDriver } from './drivers/PostgresDriver.js';
import { createSqliteDriver } from './drivers/SqliteDriver.js';

export class Database {
  private static driver: DatabaseDriver | undefined;
  private static conn: Connection | undefined;
  private static logging = false;

  private static resolveDriver(): DatabaseDriver {
    const defaultDriver = config('database.default', 'mysql');
    const pool = config('database.pool');
    const databaseSsl = config('database.ssl');
    const ssl = databaseSsl.enabled
      ? {
          rejectUnauthorized: databaseSsl.rejectUnauthorized,
          ...(databaseSsl.ca ? { ca: databaseSsl.ca } : {}),
        }
      : undefined;

    switch (defaultDriver) {
      case 'pgsql':
        return createPostgresDriver({
          host: config('database.host'),
          port: config('database.port'),
          username: config('database.username'),
          password: config('database.password'),
          name: config('database.name'),
          ...(ssl ? { ssl } : {}),
          pool,
        });
      case 'sqlite':
        return createSqliteDriver(config('database.sqlite.path'));
      case 'mysql':
      default:
        return createMySqlDriver({
          host: config('database.host'),
          port: config('database.port'),
          username: config('database.username'),
          password: config('database.password'),
          name: config('database.name'),
          timezone: config('database.timezone'),
          ...(ssl ? { ssl } : {}),
          pool,
        });
    }
  }

  /** The shared connection. Created lazily, nothing connects until the first query. */
  static connection(): Connection {
    if (this.conn) return this.conn;

    this.driver = this.resolveDriver();

    if (config('database.logging') && !this.logging) {
      this.logging = true;
      Connection.listeners.push((event) => console.log(event.sql));
    }

    this.conn = new Connection(this.driver);
    return this.conn;
  }

  /** Throws if the database can't be reached or the credentials are wrong. */
  static async authenticate(): Promise<void> {
    await this.connection().select('select 1 as ok');
  }

  static async close(): Promise<void> {
    const driver = this.driver;
    this.driver = undefined;
    this.conn = undefined;
    await driver?.close();
  }
}
