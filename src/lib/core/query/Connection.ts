import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import { QueryBuilder } from './Builder.js';
import { grammarFor, type Grammar } from './grammar/index.js';
import { Raw } from './Raw.js';
import { normalizeBinding } from './support.js';
import type { ExecResult, QueryEvent, Row } from './types.js';

type Runner = { query(sql: string, values?: unknown[]): Promise<[unknown, unknown]> };

export class Connection {
  static readonly listeners: Array<(event: QueryEvent) => void> = [];

  readonly grammar: Grammar = grammarFor('mysql');
  private inTransaction = false;

  /** `session` is set when this connection is pinned to one physical connection (transactions, SET ...). */
  constructor(
    private readonly pool: Pool,
    private readonly pinned?: PoolConnection,
  ) {}

  get dialect(): string {
    return this.grammar.dialect;
  }

  private get runner(): Runner {
    return (this.pinned ?? this.pool) as unknown as Runner;
  }

  table(name: string | Raw): QueryBuilder {
    return new QueryBuilder(this).from(name);
  }

  query(): QueryBuilder {
    return new QueryBuilder(this);
  }

  raw(sql: string, bindings: readonly unknown[] = []): Raw {
    return new Raw(sql, bindings);
  }

  async select(sql: string, bindings: readonly unknown[] = []): Promise<Row[]> {
    const params = bindings.map(normalizeBinding);
    const [rows] = await this.run(sql, params, () => this.runner.query(sql, params));
    return rows as Row[];
  }

  async selectOne(sql: string, bindings: readonly unknown[] = []): Promise<Row | null> {
    return (await this.select(sql, bindings))[0] ?? null;
  }

  async insert(sql: string, bindings: readonly unknown[] = []): Promise<boolean> {
    await this.execute(sql, bindings);
    return true;
  }

  async update(sql: string, bindings: readonly unknown[] = []): Promise<number> {
    return (await this.execute(sql, bindings)).affectedRows;
  }

  async delete(sql: string, bindings: readonly unknown[] = []): Promise<number> {
    return (await this.execute(sql, bindings)).affectedRows;
  }

  async statement(sql: string, bindings: readonly unknown[] = []): Promise<void> {
    await this.execute(sql, bindings);
  }

  async execute(sql: string, bindings: readonly unknown[] = []): Promise<ExecResult> {
    const params = bindings.map(normalizeBinding);
    const [result] = await this.run(sql, params, () => this.runner.query(sql, params));

    if (Array.isArray(result)) return { rows: result as Row[], affectedRows: result.length, insertId: undefined };

    const header = result as ResultSetHeader;
    return { rows: [], affectedRows: Number(header.affectedRows ?? 0), insertId: header.insertId || undefined };
  }

  /** Run `callback` on one physical connection (needed for SET ..., transactions). */
  async session<T>(callback: (connection: Connection) => Promise<T>): Promise<T> {
    if (this.pinned) return callback(this);

    const physical = await this.pool.getConnection();
    try {
      return await callback(new Connection(this.pool, physical));
    } finally {
      physical.release();
    }
  }

  async transaction<T>(callback: (trx: Connection) => Promise<T>): Promise<T> {
    if (this.inTransaction) return callback(this);

    return this.session(async (trx) => {
      trx.inTransaction = true;
      await trx.statement('START TRANSACTION');
      try {
        const result = await callback(trx);
        await trx.statement('COMMIT');
        return result;
      } catch (error) {
        await trx.statement('ROLLBACK').catch(() => undefined);
        throw error;
      }
    });
  }

  private async run<T>(sql: string, bindings: unknown[], execute: () => Promise<T>): Promise<T> {
    const started = Date.now();
    try {
      return await execute();
    } finally {
      const event: QueryEvent = { sql, bindings, ms: Date.now() - started, dialect: this.dialect };
      for (const listener of Connection.listeners) {
        try {
          listener(event);
        } catch {
          // a broken logger must never break a query
        }
      }
    }
  }
}
