import type { Compiled, DatePart, LockMode } from '../types.js';
import { Grammar } from './Grammar.js';

export class PostgresGrammar extends Grammar {
  readonly dialect = 'postgres';
  protected readonly quote = '"';

  protected override operator(op: string): string {
    return op;
  }

  protected dateExpr(part: DatePart, column: string): string {
    if (part === 'date') return `${column}::date`;
    if (part === 'time') return `${column}::time`;
    return `extract(${part} from ${column})`;
  }

  protected random(): string {
    return 'random()';
  }

  protected override lock(mode: LockMode): string {
    return mode === 'update' ? 'for update' : 'for share';
  }

  protected override ignoreSuffix(): string {
    return ' on conflict do nothing';
  }

  protected override returning(column: string): string {
    return ` returning ${this.wrap(column)}`;
  }

  truncate(table: string): Compiled[] {
    return [{ sql: `truncate table ${this.wrap(table)} restart identity cascade`, bindings: [] }];
  }
}
