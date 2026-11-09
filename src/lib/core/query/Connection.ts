import { QueryBuilder } from './Builder.js';
import type { DatabaseDriver, PinnedRunner, Runner } from './drivers/types.js';
import { grammarFor, type Grammar } from './grammar/index.js';
import { Raw } from './Raw.js';
import { normalizeBinding } from './support.js';
import type { ExecResult, QueryEvent, Row } from './types.js';

export class Connection {
  static readonly listeners: Array<(event: QueryEvent) => void> = [];

  readonly grammar: Grammar;
  private inTransaction = false;

  /** `pinned` is set when this connection is bound to one physical connection (transactions, SET ...). */
  constructor(
    private readonly driver: DatabaseDriver,
    private readonly pinned?: PinnedRunner,
  ) {
    this.grammar = grammarFor(driver.dialect);
  }

  get dialect(): string {
    return this.grammar.dialect;
  }

  private get runner(): Runner {
    return this.pinned ?? this.driver;
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
    return (await this.execute(sql, bindings)).rows;
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
    return this.run(sql, params, () => this.runner.run(sql, params));
  }

  /** Run `callback` on one physical connection (needed for SET ..., transactions). */
  async session<T>(callback: (connection: Connection) => Promise<T>): Promise<T> {
    if (this.pinned) return callback(this);

    const physical = await this.driver.acquire();
    try {
      return await callback(new Connection(this.driver, physical));
    } finally {
      physical.release();
    }
  }

  async transaction<T>(callback: (trx: Connection) => Promise<T>): Promise<T> {
    if (this.inTransaction) return callback(this);

    return this.session(async (trx) => {
      trx.inTransaction = true;
      await trx.statement(this.grammar.beginTransaction());
      try {
        const result = await callback(trx);
        await trx.statement(this.dialect === 'sqlite' ? 'COMMIT' : 'COMMIT');
        return result;
      } catch (error) {
        await trx.statement(this.dialect === 'sqlite' ? 'ROLLBACK' : 'ROLLBACK').catch(() => undefined);
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
