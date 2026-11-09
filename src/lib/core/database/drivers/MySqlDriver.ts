import mysql, { type Pool, type PoolConnection, type ResultSetHeader } from 'mysql2/promise';
import type { DatabaseDriver, PinnedRunner, RawResult } from '../../query/drivers/types.js';
import type { Row } from '../../query/types.js';

function normalizeResult(result: unknown): RawResult {
  if (Array.isArray(result)) {
    return { rows: result as Row[], affectedRows: result.length, insertId: undefined };
  }

  const header = result as ResultSetHeader;
  const insertId = header.insertId;
  return {
    rows: [],
    affectedRows: Number(header.affectedRows ?? 0),
    insertId: insertId === undefined || insertId === null ? undefined : String(insertId),
  };
}

export class MySqlDriver implements DatabaseDriver {
  readonly dialect = 'mysql' as const;

  constructor(private readonly pool: Pool) {}

  async run(sql: string, bindings: unknown[]): Promise<RawResult> {
    const [result] = await this.pool.query(sql, bindings);
    return normalizeResult(result);
  }

  async acquire(): Promise<PinnedRunner> {
    const connection: PoolConnection = await this.pool.getConnection();
    return {
      run: async (sql: string, bindings: unknown[]) => {
        const [result] = await connection.query(sql, bindings);
        return normalizeResult(result);
      },
      release: () => connection.release(),
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function createMySqlDriver(config: { host: string; port: number; username: string; password: string; name: string; timezone: string; ssl?: Record<string, unknown>; pool: { max: number; idleMs: number; acquireMs: number } }): MySqlDriver {
  const connection = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.name,
    timezone: config.timezone,
    charset: 'UTF8MB4_UNICODE_CI',
    waitForConnections: true,
    connectionLimit: config.pool.max,
    maxIdle: config.pool.max,
    idleTimeout: config.pool.idleMs,
    connectTimeout: config.pool.acquireMs,
    ...(config.ssl ? { ssl: config.ssl } : {}),
  });
  return new MySqlDriver(connection);
}
