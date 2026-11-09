import { DatabaseSync } from 'node:sqlite';
import type { DatabaseDriver, PinnedRunner, RawResult } from '../../query/drivers/types.js';
import type { Row } from '../../query/types.js';

export class SqliteDriver implements DatabaseDriver {
  readonly dialect = 'sqlite' as const;

  constructor(private readonly database: DatabaseSync) {}

  async run(sql: string, bindings: unknown[]): Promise<RawResult> {
    type SqliteValue = string | number | boolean | bigint | null | Uint8Array | ArrayBuffer | Date;
    const params = bindings.map((value) => (value === undefined ? null : value)) as SqliteValue[];
    const isRead = /^\s*(select|pragma|with)\b/i.test(sql);
    if (isRead) {
      const rows = this.database.prepare(sql).all(...(params as any)) as Row[];
      return { rows, affectedRows: rows.length, insertId: undefined };
    }

    const result = this.database.prepare(sql).run(...(params as any)) as { changes?: number; lastInsertRowid?: number | bigint };
    return {
      rows: [],
      affectedRows: Number(result.changes ?? 0),
      insertId: result.lastInsertRowid === undefined || result.lastInsertRowid === null ? undefined : String(result.lastInsertRowid),
    };
  }

  async acquire(): Promise<PinnedRunner> {
    return {
      run: (sql: string, bindings: unknown[]) => this.run(sql, bindings),
      release: () => undefined,
    };
  }

  async close(): Promise<void> {
    this.database.close();
  }
}

export function createSqliteDriver(path: string): SqliteDriver {
  return new SqliteDriver(new DatabaseSync(path));
}
