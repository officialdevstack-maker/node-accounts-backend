import { Pool } from 'pg';
import type { DatabaseDriver, PinnedRunner, RawResult } from '../../query/drivers/types.js';
import type { Row } from '../../query/types.js';

export function toPositional(sql: string): string {
  let output = '';
  let index = 0;
  let placeholders = 0;

  while (index < sql.length) {
    const char = sql[index]!;

    if (char === "'" || char === '"') {
      const quote = char;
      const escapeString =
        quote === "'" &&
        /[eE]/.test(sql[index - 1] ?? '') &&
        (index < 2 || !/[A-Za-z0-9_$]/.test(sql[index - 2]!));
      const start = index++;
      while (index < sql.length) {
        if (sql[index] === '\\' && escapeString && index + 1 < sql.length) {
          index += 2;
        } else if (sql[index] === quote && sql[index + 1] === quote) {
          index += 2;
        } else if (sql[index] === quote) {
          index++;
          break;
        } else {
          index++;
        }
      }
      output += sql.slice(start, index);
      continue;
    }

    if (char === '-' && sql[index + 1] === '-') {
      const start = index;
      index += 2;
      while (index < sql.length && sql[index] !== '\n') index++;
      output += sql.slice(start, index);
      continue;
    }

    if (char === '/' && sql[index + 1] === '*') {
      const start = index;
      index += 2;
      let depth = 1;
      while (index < sql.length && depth > 0) {
        if (sql[index] === '/' && sql[index + 1] === '*') {
          depth++;
          index += 2;
        } else if (sql[index] === '*' && sql[index + 1] === '/') {
          depth--;
          index += 2;
        } else {
          index++;
        }
      }
      output += sql.slice(start, index);
      continue;
    }

    if (char === '$') {
      const delimiter = /^\$[A-Za-z_][A-Za-z_0-9]*\$|^\$\$/.exec(sql.slice(index))?.[0];
      if (delimiter) {
        const start = index;
        index += delimiter.length;
        const end = sql.indexOf(delimiter, index);
        index = end === -1 ? sql.length : end + delimiter.length;
        output += sql.slice(start, index);
        continue;
      }
    }

    if (char === '?') {
      if (sql[index + 1] === '?') {
        output += '?';
        index += 2;
      } else {
        output += `$${++placeholders}`;
        index++;
      }
      continue;
    }

    output += char;
    index++;
  }

  return output;
}

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
    const result = await this.pool.query(toPositional(sql), bindings);
    return normalizeResult(result);
  }

  async acquire(): Promise<PinnedRunner> {
    const client = await this.pool.connect();
    return {
      run: async (sql: string, bindings: unknown[]) => {
        const result = await client.query(toPositional(sql), bindings);
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
