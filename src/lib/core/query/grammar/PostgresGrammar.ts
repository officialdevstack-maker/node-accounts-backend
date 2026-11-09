import type { Compiled, DatePart, LockMode, Row } from '../types.js';
import { Grammar } from './Grammar.js';

export class PostgresGrammar extends Grammar {
  readonly dialect = 'pgsql';
  protected readonly quote = '"';

  protected dateExpr(part: DatePart, column: string): string {
    switch (part) {
      case 'date':
        return `date(${column})`;
      case 'day':
        return `extract(day from ${column})`;
      case 'month':
        return `extract(month from ${column})`;
      case 'year':
        return `extract(year from ${column})`;
      case 'time':
        return `date_trunc('second', ${column})`;
    }
  }

  protected random(): string {
    return 'random()';
  }

  protected override lock(mode: LockMode): string {
    return mode === 'update' ? 'for update' : 'for share';
  }

  protected override returning(column: string): string {
    return ` returning ${this.segment(column)}`;
  }

  override upsert(table: string, rows: Row[], uniqueBy: string[], update: string[]): Compiled {
    const insert = this.insert(table, rows);
    const conflict = uniqueBy.map((c) => this.segment(c)).join(', ');
    const sets = update.map((c) => `${this.segment(c)} = excluded.${this.segment(c)}`).join(', ');
    return { sql: `${insert.sql} on conflict (${conflict}) do update set ${sets}`, bindings: insert.bindings };
  }

  truncate(table: string): Compiled[] {
    return [{ sql: `truncate table ${this.wrap(table)} restart identity cascade`, bindings: [] }];
  }
}
