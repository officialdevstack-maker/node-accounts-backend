import mysql, { type Pool } from 'mysql2/promise';
import { config } from '../config/index.js';
import { Connection } from '../query/Connection.js';

export class Database {
  private static pool: Pool | undefined;
  private static conn: Connection | undefined;
  private static logging = false;

  /** The shared connection. Created lazily, nothing connects until the first query. */
  static connection(): Connection {
    if (this.conn) return this.conn;

    const pool = config('database.pool');
    this.pool = mysql.createPool({
      host: config('database.host'),
      port: config('database.port'),
      user: config('database.username'),
      password: config('database.password'),
      database: config('database.name'),
      timezone: config('database.timezone'),
      charset: 'UTF8MB4_UNICODE_CI',
      waitForConnections: true,
      connectionLimit: pool.max,
      maxIdle: pool.max,
      idleTimeout: pool.idleMs,
      connectTimeout: pool.acquireMs,
    });

    if (config('database.logging') && !this.logging) {
      this.logging = true;
      Connection.listeners.push((event) => console.log(event.sql));
    }

    this.conn = new Connection(this.pool);
    return this.conn;
  }

  /** Throws if the database can't be reached or the credentials are wrong. */
  static async authenticate(): Promise<void> {
    await this.connection().select('select 1 as ok');
  }

  static async close(): Promise<void> {
    const pool = this.pool;
    this.pool = undefined;
    this.conn = undefined;
    await pool?.end();
  }
}
