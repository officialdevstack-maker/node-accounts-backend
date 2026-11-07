import { Raw } from '../query/Raw.js';
import { pluralize, quoteId, quoteValue } from './support.js';

export type ReferentialAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';

export interface IndexDefinition {
  fields: string[];
  unique: boolean;
  name?: string | undefined;
}

interface ForeignKey {
  table: string;
  column: string;
  onDelete?: ReferentialAction | undefined;
  onUpdate?: ReferentialAction | undefined;
}

/** Returned by every column method so modifiers can be chained: t.string('email', 120).nullable().unique() */
export class ColumnBuilder {
  isNullable = false;
  hasDefault = false;
  defaultValue: unknown = null;
  isUnique = false;
  isPrimary = false;
  isAutoIncrement = false;
  foreign: ForeignKey | undefined = undefined;

  constructor(
    readonly name: string,
    readonly type: string,
    private readonly blueprint: Blueprint,
  ) {}

  /** Columns are NOT NULL unless you say otherwise. */
  nullable(value = true): this {
    this.isNullable = value;
    return this;
  }

  default(value: unknown): this {
    this.hasDefault = true;
    this.defaultValue = value;
    return this;
  }

  /** DEFAULT CURRENT_TIMESTAMP */
  useCurrent(): this {
    return this.default(new Raw('CURRENT_TIMESTAMP'));
  }

  unique(): this {
    this.isUnique = true;
    return this;
  }

  primary(): this {
    this.isPrimary = true;
    this.isNullable = false;
    return this;
  }

  index(): this {
    this.blueprint.index(this.name);
    return this;
  }

  references(table: string, column = 'id'): this {
    this.foreign = { ...this.foreign, table, column };
    return this;
  }

  /** foreignId('user_id').constrained()  ->  references users.id (table guessed from the column name) */
  constrained(table?: string, column = 'id'): this {
    return this.references(table ?? pluralize(this.name.replace(/_id$/, '')), column);
  }

  onDelete(action: ReferentialAction): this {
    if (this.foreign) this.foreign.onDelete = action;
    return this;
  }

  onUpdate(action: ReferentialAction): this {
    if (this.foreign) this.foreign.onUpdate = action;
    return this;
  }

  cascadeOnDelete(): this {
    return this.onDelete('CASCADE');
  }

  nullOnDelete(): this {
    this.isNullable = true;
    return this.onDelete('SET NULL');
  }

  /** The column definition as it appears in CREATE TABLE / ADD COLUMN. */
  sql(): string {
    const parts = [quoteId(this.name), this.type, this.isNullable ? 'NULL' : 'NOT NULL'];
    if (this.hasDefault) parts.push(`DEFAULT ${quoteValue(this.defaultValue)}`);
    if (this.isAutoIncrement) parts.push('AUTO_INCREMENT');
    if (this.isUnique) parts.push('UNIQUE');
    return parts.join(' ');
  }
}

export class Blueprint {
  readonly columns: ColumnBuilder[] = [];
  readonly indexes: IndexDefinition[] = [];

  constructor(readonly table: string) {}

  private add(name: string, type: string, opts: { primary?: boolean; autoIncrement?: boolean } = {}): ColumnBuilder {
    const column = new ColumnBuilder(name, type, this);
    if (opts.primary) column.primary();
    if (opts.autoIncrement) column.isAutoIncrement = true;
    this.columns.push(column);
    return column;
  }

  // ---- keys -------------------------------------------------------------------------------
  id(name = 'id'): ColumnBuilder {
    return this.add(name, 'INT', { primary: true, autoIncrement: true });
  }

  unsignedId(name = 'id'): ColumnBuilder {
    return this.add(name, 'INT UNSIGNED', { primary: true, autoIncrement: true });
  }

  bigId(name = 'id'): ColumnBuilder {
    return this.add(name, 'BIGINT', { primary: true, autoIncrement: true });
  }

  foreignId(name: string): ColumnBuilder {
    return this.add(name, 'INT');
  }

  foreignUnsignedId(name: string): ColumnBuilder {
    return this.add(name, 'INT UNSIGNED');
  }

  foreignBigId(name: string): ColumnBuilder {
    return this.add(name, 'BIGINT');
  }

  foreignUuid(name: string): ColumnBuilder {
    return this.uuid(name);
  }

  uuid(name: string): ColumnBuilder {
    return this.add(name, 'CHAR(36)');
  }

  // ---- columns ----------------------------------------------------------------------------
  string(name: string, length = 255): ColumnBuilder {
    return this.add(name, `VARCHAR(${Math.trunc(length)})`);
  }

  text(name: string): ColumnBuilder {
    return this.add(name, 'TEXT');
  }

  integer(name: string): ColumnBuilder {
    return this.add(name, 'INT');
  }

  bigInteger(name: string): ColumnBuilder {
    return this.add(name, 'BIGINT');
  }

  boolean(name: string): ColumnBuilder {
    return this.add(name, 'TINYINT(1)');
  }

  /** Use for money: decimal('amount', 14, 2) */
  decimal(name: string, precision = 10, scale = 2): ColumnBuilder {
    return this.add(name, `DECIMAL(${Math.trunc(precision)}, ${Math.trunc(scale)})`);
  }

  float(name: string): ColumnBuilder {
    return this.add(name, 'FLOAT');
  }

  json(name: string): ColumnBuilder {
    return this.add(name, 'JSON');
  }

  enum(name: string, values: string[]): ColumnBuilder {
    return this.add(name, `ENUM(${values.map(quoteValue).join(', ')})`);
  }

  /** Date only, no time. */
  date(name: string): ColumnBuilder {
    return this.add(name, 'DATE');
  }

  dateTime(name: string): ColumnBuilder {
    return this.add(name, 'DATETIME');
  }

  timestamp(name: string): ColumnBuilder {
    return this.dateTime(name);
  }

  /** created_at + updated_at (nullable, filled in by your code). */
  timestamps(): void {
    this.dateTime('created_at').nullable();
    this.dateTime('updated_at').nullable();
  }

  softDeletes(name = 'deleted_at'): ColumnBuilder {
    return this.dateTime(name).nullable();
  }

  // ---- indexes ----------------------------------------------------------------------------
  index(fields: string | string[], options: { name?: string } = {}): void {
    this.indexes.push({ fields: [fields].flat(), unique: false, name: options.name });
  }

  /** Composite unique constraint: t.unique(['user_id', 'wallet_id']). For one column use .unique() on it. */
  unique(fields: string | string[], options: { name?: string } = {}): void {
    this.indexes.push({ fields: [fields].flat(), unique: true, name: options.name });
  }

  // ---- compiling --------------------------------------------------------------------------
  indexName(fields: string[], unique: boolean): string {
    return `${this.table}_${fields.join('_')}_${unique ? 'unique' : 'index'}`;
  }

  private indexSql(index: IndexDefinition): string {
    const name = quoteId(index.name ?? this.indexName(index.fields, index.unique));
    return `${index.unique ? 'UNIQUE ' : ''}KEY ${name} (${index.fields.map(quoteId).join(', ')})`;
  }

  private foreignSql(column: ColumnBuilder): string | undefined {
    const f = column.foreign;
    if (!f) return undefined;

    let sql = `CONSTRAINT ${quoteId(`${this.table}_${column.name}_foreign`)} FOREIGN KEY (${quoteId(column.name)}) REFERENCES ${quoteId(f.table)} (${quoteId(f.column)})`;
    if (f.onDelete) sql += ` ON DELETE ${f.onDelete}`;
    if (f.onUpdate) sql += ` ON UPDATE ${f.onUpdate}`;
    return sql;
  }

  createSql(): string {
    const primary = this.columns.filter((c) => c.isPrimary).map((c) => quoteId(c.name));
    const lines = [
      ...this.columns.map((c) => c.sql()),
      ...(primary.length ? [`PRIMARY KEY (${primary.join(', ')})`] : []),
      ...this.indexes.map((i) => this.indexSql(i)),
      ...this.columns.map((c) => this.foreignSql(c)).filter((s): s is string => Boolean(s)),
    ];
    return `CREATE TABLE ${quoteId(this.table)} (\n  ${lines.join(',\n  ')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
  }

  /** One statement per change, for schema.table(). */
  alterSql(): string[] {
    const alter = `ALTER TABLE ${quoteId(this.table)}`;
    return [
      ...this.columns.map((c) => `${alter} ADD COLUMN ${c.sql()}`),
      ...this.indexes.map((i) => `${alter} ADD ${this.indexSql(i)}`),
      ...this.columns.map((c) => this.foreignSql(c)).filter((s): s is string => Boolean(s)).map((s) => `${alter} ADD ${s}`),
    ];
  }
}
