import { MySqlSchemaGrammar } from './MySqlSchemaGrammar.js';
import { PostgresSchemaGrammar } from './PostgresSchemaGrammar.js';
import { SqliteSchemaGrammar } from './SqliteSchemaGrammar.js';
import { SchemaGrammar } from './SchemaGrammar.js';

export { SchemaGrammar } from './SchemaGrammar.js';
export { MySqlSchemaGrammar, PostgresSchemaGrammar, SqliteSchemaGrammar };

export function schemaGrammarFor(dialect: string): SchemaGrammar {
  switch (dialect) {
    case 'pgsql':
    case 'postgres':
    case 'postgresql':
      return new PostgresSchemaGrammar();
    case 'sqlite':
      return new SqliteSchemaGrammar();
    case 'mysql':
    case 'mariadb':
    default:
      return new MySqlSchemaGrammar();
  }
}
