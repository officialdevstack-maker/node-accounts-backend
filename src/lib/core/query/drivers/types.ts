import type { Row } from '../types.js';

export type Dialect = 'mysql' | 'pgsql' | 'sqlite';

export interface RawResult {
  rows: Row[];
  affectedRows: number;
  insertId: number | string | undefined;
}

/** Runs one statement. Bindings use `?` placeholders; each driver converts them if it has to. */
export interface Runner {
  run(sql: string, bindings: unknown[]): Promise<RawResult>;
}

/** One physical connection, held until release() (transactions, SET ..., DDL batches). */
export interface PinnedRunner extends Runner {
  release(): void;
}

export interface DatabaseDriver extends Runner {
  readonly dialect: Dialect;
  acquire(): Promise<PinnedRunner>;
  close(): Promise<void>;
}
