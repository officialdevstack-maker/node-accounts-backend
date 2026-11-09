import type { Blueprint, ColumnBuilder, IndexDefinition } from '../Blueprint.js';
import { quoteId } from '../support.js';

export abstract class SchemaGrammar {
  abstract readonly dialect: string;

  protected abstract columnDefinition(column: ColumnBuilder, withPosition?: boolean): string;
  protected abstract indexDefinition(index: IndexDefinition, table: string): string;
  protected abstract foreignKeyDefinition(table: string, column: ColumnBuilder): string | undefined;

  protected tableOptions(): string {
    return '';
  }

  createTable(table: string, blueprint: Blueprint): string {
    const primary = blueprint.columns.filter((column) => column.isPrimary).map((column) => quoteId(column.name));
    const lines = [
      ...blueprint.columns.map((column) => this.columnDefinition(column)),
      ...(primary.length ? [`PRIMARY KEY (${primary.join(', ')})`] : []),
      ...blueprint.indexes.map((index) => this.indexDefinition(index, table)),
      ...blueprint.columns.map((column) => this.foreignKeyDefinition(table, column)).filter((value): value is string => Boolean(value)),
    ];
    return `CREATE TABLE ${quoteId(table)} (\n  ${lines.join(',\n  ')}\n)${this.tableOptions()}`;
  }

  alterTable(table: string, blueprint: Blueprint): string[] {
    const alter = `ALTER TABLE ${quoteId(table)}`;
    const statements: string[] = [];

    for (const column of blueprint.columns) {
      const sql = this.columnDefinition(column, true);
      statements.push(`${alter} ${column.isChange ? 'MODIFY COLUMN' : 'ADD COLUMN'} ${sql}`);
    }

    for (const index of blueprint.indexes) statements.push(`${alter} ADD ${this.indexDefinition(index, table)}`);
    for (const column of blueprint.columns) {
      const sql = this.foreignKeyDefinition(table, column);
      if (sql) statements.push(`${alter} ADD ${sql}`);
    }
    for (const drop of blueprint.drops) statements.push(`${alter} ${drop}`);
    return statements;
  }
}
