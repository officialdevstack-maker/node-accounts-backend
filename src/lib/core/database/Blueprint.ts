import { config } from '../config/index.js';
import { Raw } from '../query/Raw.js';
import { schemaGrammarFor } from './grammar/index.js';
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
  isChange = false;
  isFirst = false;
  afterColumn: string | undefined = undefined;
  commentText: string | undefined = undefined;
  foreign: ForeignKey | undefined = undefined;

  constructor(
    readonly name: string,
    public type: string,
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

  useCurrentOnUpdate(): this {
    return this.default(new Raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
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

  unsigned(): this {
    if (!/UNSIGNED/i.test(this.type)) this.type += ' UNSIGNED';
    return this;
  }

  comment(text: string): this {
    this.commentText = text;
    return this;
  }

  /** ALTER only: place the column after another one. */
  after(column: string): this {
    this.afterColumn = column;
    return this;
  }

  /** ALTER only: place the column first. */
  first(): this {
    this.isFirst = true;
    return this;
  }

  /** ALTER only: redefine an existing column (MODIFY COLUMN). Repeat every modifier you want to keep. */
  change(): this {
    this.isChange = true;
    return this;
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
  sql(withPosition = false): string {
    const parts = [quoteId(this.name), this.type, this.isNullable ? 'NULL' : 'NOT NULL'];
    if (this.hasDefault) parts.push(`DEFAULT ${quoteValue(this.defaultValue)}`);
    if (this.isAutoIncrement) parts.push('AUTO_INCREMENT');
    if (this.isUnique) parts.push('UNIQUE');
    if (this.commentText !== undefined) parts.push(`COMMENT ${quoteValue(this.commentText)}`);
    if (withPosition && this.isFirst) parts.push('FIRST');
    else if (withPosition && this.afterColumn) parts.push(`AFTER ${quoteId(this.afterColumn)}`);
    return parts.join(' ');
  }
}

export class Blueprint {
  readonly columns: ColumnBuilder[] = [];
  readonly indexes: IndexDefinition[] = [];
  readonly drops: string[] = [];

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

  char(name: string, length = 255): ColumnBuilder {
    return this.add(name, `CHAR(${Math.trunc(length)})`);
  }

  tinyInteger(name: string): ColumnBuilder {
    return this.add(name, 'TINYINT');
  }

  smallInteger(name: string): ColumnBuilder {
    return this.add(name, 'SMALLINT');
  }

  mediumInteger(name: string): ColumnBuilder {
    return this.add(name, 'MEDIUMINT');
  }

  integer(name: string): ColumnBuilder {
    return this.add(name, 'INT');
  }

  unsignedInteger(name: string): ColumnBuilder {
    return this.add(name, 'INT UNSIGNED');
  }

  bigInteger(name: string): ColumnBuilder {
    return this.add(name, 'BIGINT');
  }

  unsignedBigInteger(name: string): ColumnBuilder {
    return this.add(name, 'BIGINT UNSIGNED');
  }

  text(name: string): ColumnBuilder {
    return this.add(name, 'TEXT');
  }

  mediumText(name: string): ColumnBuilder {
    return this.add(name, 'MEDIUMTEXT');
  }

  longText(name: string): ColumnBuilder {
    return this.add(name, 'LONGTEXT');
  }

  boolean(name: string): ColumnBuilder {
    return this.add(name, 'TINYINT(1)');
  }

  /** Use for money: decimal('amount', 14, 2) */
  decimal(name: string, precision = 10, scale = 2): ColumnBuilder {
    return this.add(name, `DECIMAL(${Math.trunc(precision)}, ${Math.trunc(scale)})`);
  }

  double(name: string): ColumnBuilder {
    return this.add(name, 'DOUBLE');
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

  time(name: string): ColumnBuilder {
    return this.add(name, 'TIME');
  }

  year(name: string): ColumnBuilder {
    return this.add(name, 'YEAR');
  }

  binary(name: string): ColumnBuilder {
    return this.add(name, 'BLOB');
  }

  ipAddress(name = 'ip_address'): ColumnBuilder {
    return this.add(name, 'VARCHAR(45)');
  }

  ulid(name = 'id'): ColumnBuilder {
    return this.add(name, 'CHAR(26)');
  }

  rememberToken(): ColumnBuilder {
    return this.string('remember_token', 100).nullable();
  }

  /** created_at + updated_at. With `useCurrent`, the database fills them even for raw inserts. */
  timestamps(useCurrent = false): void {
    const created = this.dateTime('created_at');
    const updated = this.dateTime('updated_at');
    if (useCurrent) {
      created.default(new Raw('CURRENT_TIMESTAMP'));
      updated.default(new Raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    } else {
      created.nullable();
      updated.nullable();
    }
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

  dropColumn(...names: string[]): void {
    for (const name of names) this.drops.push(`DROP COLUMN ${quoteId(name)}`);
  }

  dropIndex(name: string): void {
    this.drops.push(`DROP INDEX ${quoteId(name)}`);
  }

  dropUnique(name: string): void {
    this.dropIndex(name);
  }

  dropForeign(columnOrName: string): void {
    const name = columnOrName.endsWith('_foreign') ? columnOrName : `${this.table}_${columnOrName}_foreign`;
    this.drops.unshift(`DROP FOREIGN KEY ${quoteId(name)}`);
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
    return schemaGrammarFor(config('database.default', 'mysql')).createTable(this.table, this);
  }

  /** One statement per change, for schema.table(). */
  alterSql(): string[] {
    return schemaGrammarFor(config('database.default', 'mysql')).alterTable(this.table, this);
  }
}
