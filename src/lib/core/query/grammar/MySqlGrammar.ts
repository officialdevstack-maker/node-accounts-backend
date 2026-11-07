import type { Compiled, DatePart, LockMode, Row } from '../types.js';
import { Grammar } from './Grammar.js';

export class MySqlGrammar extends Grammar {
  readonly dialect = 'mysql';
  protected readonly quote = '`';
  protected override readonly limitedWrites: boolean = true;

  protected dateExpr(part: DatePart, column: string): string {
    return `${part}(${column})`;
  }

  protected random(): string {
    return 'rand()';
  }

  protected override lock(mode: LockMode): string {
    return mode === 'update' ? 'for update' : 'lock in share mode';
  }

  protected override insertVerb(ignore: boolean): string {
    return ignore ? 'insert ignore into' : 'insert into';
  }

  protected override emptyInsert(): string {
    return '() values ()';
  }

  protected override limitOffset(limit: number | undefined, offset: number | undefined): string[] {
    if (limit === undefined && offset !== undefined) return ['limit 18446744073709551615', `offset ${offset}`];
    return super.limitOffset(limit, offset);
  }

  override upsert(table: string, rows: Row[], _uniqueBy: string[], update: string[]): Compiled {
    const insert = this.insert(table, rows);
    const sets = update.map((c) => `${this.segment(c)} = values(${this.segment(c)})`).join(', ');
    return { sql: `${insert.sql} on duplicate key update ${sets}`, bindings: insert.bindings };
  }

  truncate(table: string): Compiled[] {
    return [{ sql: `truncate table ${this.wrap(table)}`, bindings: [] }];
  }
}
