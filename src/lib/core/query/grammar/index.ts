import { MySqlGrammar } from './MySqlGrammar.js';
import type { Grammar } from './Grammar.js';

export { Grammar } from './Grammar.js';
export { MySqlGrammar };

export function grammarFor(dialect: string): Grammar {
  if (dialect !== 'mysql' && dialect !== 'mariadb') {
    throw new Error(`The query builder only supports MySQL (received "${dialect}").`);
  }
  return new MySqlGrammar();
}
