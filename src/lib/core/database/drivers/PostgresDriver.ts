import { Pool } from 'pg';
import type { DatabaseDriver, PinnedRunner, RawResult } from '../../query/drivers/types.js';
import type { Row } from '../../query/types.js';

function normalizeResult(result: { rows?: unknown[]; rowCount?: number | null }): RawResult {
  return {
    rows: Array.isArray(result.rows) ? (result.rows as Row[]) : [],
    affectedRows: Number(result.rowCount ?? 0),
    insertId: undefined,
  };
}

export class PostgresDriver implements DatabaseDriver {
  readonly dialect = 'pgsql' as const;

  constructor(private readonly pool: Pool) {}

  async run(sql: string, bindings: unknown[]): Promise<RawResult> {
    const result = await this.pool.query(sql, bindings);
    return normalizeResult(result);
  }

  async acquire(): Promise<PinnedRunner> {
    const client = await this.pool.connect();
    return {
      run: async (sql: string, bindings: unknown[]) => {
        const result = await client.query(sql, bindings);
        return normalizeResult(result);
      },
      release: () => client.release(),
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function createPostgresDriver(config: { host: string; port: number; username: string; password: string; name: string; ssl?: { rejectUnauthorized?: boolean; ca?: string }; pool: { max: number; idleMs: number; acquireMs: number } }): PostgresDriver {
  const pool = new Pool({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.name,
    max: config.pool.max,
    idleTimeoutMillis: config.pool.idleMs,
    connectionTimeoutMillis: config.pool.acquireMs,
    ...(config.ssl ? { ssl: config.ssl } : {}),
  });
  return new PostgresDriver(pool);
}
