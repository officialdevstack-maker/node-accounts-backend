import type { Compiled, DatePart, LockMode, Row } from '../types.js';
import { Grammar } from './Grammar.js';

export class SqliteGrammar extends Grammar {
  readonly dialect = 'sqlite';
  protected readonly quote = '"';
  protected override readonly limitedWrites = false;

  protected dateExpr(part: DatePart, column: string): string {
    switch (part) {
      case 'date':
        return `date(${column})`;
      case 'day':
        return `cast(strftime('%d', ${column}) as integer)`;
      case 'month':
        return `cast(strftime('%m', ${column}) as integer)`;
      case 'year':
        return `cast(strftime('%Y', ${column}) as integer)`;
      case 'time':
        return `strftime('%H:%M:%S', ${column})`;
    }
  }

  protected random(): string {
    return 'random()';
  }

  protected override lock(_mode: LockMode): string {
    return '';
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
    return [{ sql: `delete from ${this.wrap(table)}`, bindings: [] }];
  }
}
