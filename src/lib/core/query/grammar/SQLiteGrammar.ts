import type { Compiled, DatePart } from '../types.js';
import { Grammar } from './Grammar.js';

export class SQLiteGrammar extends Grammar {
  readonly dialect = 'sqlite';
  protected readonly quote = '"';

  protected dateExpr(part: DatePart, column: string): string {
    switch (part) {
      case 'date':
        return `strftime('%Y-%m-%d', ${column})`;
      case 'time':
        return `strftime('%H:%M:%S', ${column})`;
      case 'day':
        return `cast(strftime('%d', ${column}) as integer)`;
      case 'month':
        return `cast(strftime('%m', ${column}) as integer)`;
      case 'year':
        return `cast(strftime('%Y', ${column}) as integer)`;
    }
  }

  protected random(): string {
    return 'random()';
  }

  protected override insertVerb(ignore: boolean): string {
    return ignore ? 'insert or ignore into' : 'insert into';
  }

  protected override limitOffset(limit: number | undefined, offset: number | undefined): string[] {
    if (limit === undefined && offset !== undefined) return ['limit -1', `offset ${offset}`];
    return super.limitOffset(limit, offset);
  }

  truncate(table: string): Compiled[] {
    return [{ sql: `delete from ${this.wrap(table)}`, bindings: [] }];
  }
}
