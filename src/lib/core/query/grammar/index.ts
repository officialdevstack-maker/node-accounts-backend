import { MySqlGrammar } from './MySqlGrammar.js';
import { PostgresGrammar } from './PostgresGrammar.js';
import { SqliteGrammar } from './SqliteGrammar.js';
import type { Grammar } from './Grammar.js';

export { Grammar } from './Grammar.js';
export { MySqlGrammar, PostgresGrammar, SqliteGrammar };

export function grammarFor(dialect: string): Grammar {
  switch (dialect) {
    case 'postgres':
    case 'pgsql':
    case 'postgresql':
      return new PostgresGrammar();
    case 'sqlite':
      return new SqliteGrammar();
    case 'mysql':
    case 'mariadb':
      return new MySqlGrammar();
    default:
      throw new Error(`The query builder does not support dialect "${dialect}".`);
  }
}
