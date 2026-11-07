import { QueryTypes, type Sequelize, type Transaction } from 'sequelize';
import { QueryBuilder } from './Builder.js';
import { grammarFor, type Grammar } from './grammar/index.js';
import { Raw } from './Raw.js';
import { normalizeBinding } from './support.js';
import type { ExecResult, QueryEvent, Row } from './types.js';

export class Connection {
  static readonly listeners: Array<(event: QueryEvent) => void> = [];

  readonly grammar: Grammar;

  constructor(
    readonly sequelize: Sequelize,
    private readonly trx?: Transaction,
  ) {
    this.grammar = grammarFor(sequelize.getDialect());
  }

  get dialect(): string {
    return this.grammar.dialect;
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
    const rows = await this.run(sql, params, () =>
      this.sequelize.query(sql, { replacements: params, type: QueryTypes.SELECT, ...this.transactionOption() }),
    );
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
    const [results, meta] = await this.run(sql, params, () =>
      this.sequelize.query(sql, { replacements: params, type: QueryTypes.RAW, ...this.transactionOption() }),
    );

    let rows: Row[] = [];
    let affected: number | undefined;
    let insertId: number | string | undefined;

    const read = (source: unknown) => {
      if (typeof source === 'number') {
        affected ??= source;
      } else if (source && typeof source === 'object' && !Array.isArray(source)) {
        const o = source as Record<string, unknown>;
        affected ??= (o.affectedRows ?? o.changes ?? o.rowCount) as number | undefined;
        insertId ??= (o.insertId ?? o.lastID) as number | string | undefined;
      }
    };

    if (Array.isArray(results)) rows = results as Row[];
    else if (typeof results === 'number') insertId = results;
    else read(results);
    read(meta);

    return { rows, affectedRows: Number(affected ?? rows.length), insertId };
  }

  async transaction<T>(callback: (trx: Connection) => Promise<T>): Promise<T> {
    if (this.trx) return callback(this);
    return this.sequelize.transaction((transaction) => callback(new Connection(this.sequelize, transaction)));
  }

  private transactionOption(): { transaction?: Transaction } {
    return this.trx ? { transaction: this.trx } : {};
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
