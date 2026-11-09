import type { Blueprint, ColumnBuilder, IndexDefinition } from '../Blueprint.js';
import { quoteId } from '../support.js';
import { SchemaGrammar } from './SchemaGrammar.js';

export class MySqlSchemaGrammar extends SchemaGrammar {
  readonly dialect = 'mysql';

  protected override columnDefinition(column: ColumnBuilder, withPosition = false): string {
    return column.sql(withPosition);
  }

  protected override indexDefinition(index: IndexDefinition, table: string): string {
    const name = quoteId(index.name ?? `${table}_${index.fields.join('_')}_${index.unique ? 'unique' : 'index'}`);
    return `${index.unique ? 'UNIQUE ' : ''}KEY ${name} (${index.fields.map(quoteId).join(', ')})`;
  }

  protected override foreignKeyDefinition(table: string, column: ColumnBuilder): string | undefined {
    const f = column.foreign;
    if (!f) return undefined;

    let sql = `CONSTRAINT ${quoteId(`${table}_${column.name}_foreign`)} FOREIGN KEY (${quoteId(column.name)}) REFERENCES ${quoteId(f.table)} (${quoteId(f.column)})`;
    if (f.onDelete) sql += ` ON DELETE ${f.onDelete}`;
    if (f.onUpdate) sql += ` ON UPDATE ${f.onUpdate}`;
    return sql;
  }

  protected override tableOptions(): string {
    return ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
  }
}
