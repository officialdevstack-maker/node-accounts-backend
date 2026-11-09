import type { ColumnBuilder, IndexDefinition } from '../Blueprint.js';
import { quoteId } from '../support.js';
import { SchemaGrammar } from './SchemaGrammar.js';

export class SqliteSchemaGrammar extends SchemaGrammar {
  readonly dialect = 'sqlite';

  protected override columnDefinition(column: ColumnBuilder, withPosition = false): string {
    let sql = column.sql(withPosition).replace(/`/g, '"').replace(/\s+UNSIGNED\b/gi, '');
    sql = sql.replace(/AUTO_INCREMENT/gi, '');
    sql = sql.replace(/INTEGER\s+NOT\s+NULL\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY');
    sql = sql.replace(/DATETIME\b/gi, 'TEXT');
    sql = sql.replace(/TINYINT\(1\)/gi, 'BOOLEAN');
    return sql;
  }

  protected override indexDefinition(index: IndexDefinition, table: string): string {
    const fields = index.fields.map(quoteId).join(', ');
    return `${index.unique ? 'UNIQUE' : 'INDEX'} (${fields})`;
  }

  protected override foreignKeyDefinition(table: string, column: ColumnBuilder): string | undefined {
    const f = column.foreign;
    if (!f) return undefined;
    let sql = `CONSTRAINT ${quoteId(`${table}_${column.name}_foreign`)} FOREIGN KEY (${quoteId(column.name)}) REFERENCES ${quoteId(f.table)} (${quoteId(f.column)})`;
    if (f.onDelete) sql += ` ON DELETE ${f.onDelete}`;
    if (f.onUpdate) sql += ` ON UPDATE ${f.onUpdate}`;
    return sql;
  }
}
