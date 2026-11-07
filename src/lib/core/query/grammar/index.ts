import { MySqlGrammar } from './MySqlGrammar.js';
import { PostgresGrammar } from './PostgresGrammar.js';
import { SQLiteGrammar } from './SQLiteGrammar.js';
import type { Grammar } from './Grammar.js';

export { Grammar } from './Grammar.js';
export { MySqlGrammar, PostgresGrammar, SQLiteGrammar };

export function grammarFor(dialect: string): Grammar {
  switch (dialect) {
    case 'mysql':
    case 'mariadb':
      return new MySqlGrammar();
    case 'postgres':
      return new PostgresGrammar();
    case 'sqlite':
      return new SQLiteGrammar();
    default:
      throw new Error(`The query builder has no grammar for dialect "${dialect}" (supported: mysql, mariadb, postgres, sqlite).`);
  }
}
