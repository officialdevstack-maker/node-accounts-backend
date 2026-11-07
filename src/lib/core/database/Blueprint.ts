// database/Blueprint.ts
// Describes a table's columns, Laravel style:  t.string('email').unique();  t.foreignId('user_id').constrained();
import { DataTypes, Sequelize, type ModelAttributeColumnOptions } from 'sequelize';
import { pluralize } from './support.js';

export type ReferentialAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';

export interface IndexDefinition {
  fields: string[];
  unique: boolean;
  name?: string;
}

/** Returned by every column method so modifiers can be chained: t.string('email', 120).nullable().unique() */
export class ColumnBuilder {
  constructor(
    readonly name: string,
    readonly definition: ModelAttributeColumnOptions,
    private readonly blueprint: Blueprint,
  ) {}

  /** Columns are NOT NULL unless you say otherwise. */
  nullable(value = true): this {
    this.definition.allowNull = value;
    return this;
  }

  default(value: unknown): this {
    this.definition.defaultValue = value;
    return this;
  }

  /** DEFAULT CURRENT_TIMESTAMP */
  useCurrent(): this {
    this.definition.defaultValue = Sequelize.literal('CURRENT_TIMESTAMP');
    return this;
  }

  unique(): this {
    this.definition.unique = true;
    return this;
  }

  primary(): this {
    this.definition.primaryKey = true;
    this.definition.allowNull = false;
    return this;
  }

  index(): this {
    this.blueprint.index(this.name);
    return this;
  }

  references(table: string, column = 'id'): this {
    this.definition.references = { model: table, key: column };
    return this;
  }

  /** foreignId('user_id').constrained()  ->  references users.id (table guessed from the column name) */
  constrained(table?: string, column = 'id'): this {
    return this.references(table ?? pluralize(this.name.replace(/_id$/, '')), column);
  }

  onDelete(action: ReferentialAction): this {
    this.definition.onDelete = action;
    return this;
  }

  onUpdate(action: ReferentialAction): this {
    this.definition.onUpdate = action;
    return this;
  }

  cascadeOnDelete(): this {
    return this.onDelete('CASCADE');
  }

  nullOnDelete(): this {
    this.definition.allowNull = true;
    return this.onDelete('SET NULL');
  }
}

export class Blueprint {
  readonly columns: ColumnBuilder[] = [];
  readonly indexes: IndexDefinition[] = [];

  constructor(readonly table: string) {}

  private add(name: string, type: ModelAttributeColumnOptions['type'], extra: Partial<ModelAttributeColumnOptions> = {}): ColumnBuilder {
    const column = new ColumnBuilder(name, { type, allowNull: false, ...extra }, this);
    this.columns.push(column);
    return column;
  }

  // ---- keys -------------------------------------------------------------------------------
  /** Auto-incrementing INTEGER primary key. */
  id(name = 'id'): ColumnBuilder {
    return this.add(name, DataTypes.INTEGER, { primaryKey: true, autoIncrement: true });
  }

  /** Auto-incrementing BIGINT primary key (pair it with foreignBigId). */
  bigId(name = 'id'): ColumnBuilder {
    return this.add(name, DataTypes.BIGINT, { primaryKey: true, autoIncrement: true });
  }

  /** Foreign key column matching id(). Chain .constrained() to add the FOREIGN KEY. */
  foreignId(name: string): ColumnBuilder {
    return this.add(name, DataTypes.INTEGER);
  }

  foreignBigId(name: string): ColumnBuilder {
    return this.add(name, DataTypes.BIGINT);
  }

  foreignUuid(name: string): ColumnBuilder {
    return this.add(name, DataTypes.UUID);
  }

  uuid(name: string): ColumnBuilder {
    return this.add(name, DataTypes.UUID);
  }

  // ---- columns ----------------------------------------------------------------------------
  string(name: string, length = 255): ColumnBuilder {
    return this.add(name, DataTypes.STRING(length));
  }

  text(name: string): ColumnBuilder {
    return this.add(name, DataTypes.TEXT);
  }

  integer(name: string): ColumnBuilder {
    return this.add(name, DataTypes.INTEGER);
  }

  bigInteger(name: string): ColumnBuilder {
    return this.add(name, DataTypes.BIGINT);
  }

  boolean(name: string): ColumnBuilder {
    return this.add(name, DataTypes.BOOLEAN);
  }

  /** Use for money: decimal('amount', 14, 2) */
  decimal(name: string, precision = 10, scale = 2): ColumnBuilder {
    return this.add(name, DataTypes.DECIMAL(precision, scale));
  }

  float(name: string): ColumnBuilder {
    return this.add(name, DataTypes.FLOAT);
  }

  json(name: string): ColumnBuilder {
    return this.add(name, DataTypes.JSON);
  }

  enum(name: string, values: string[]): ColumnBuilder {
    return this.add(name, DataTypes.ENUM(...values));
  }

  /** Date only, no time. */
  date(name: string): ColumnBuilder {
    return this.add(name, DataTypes.DATEONLY);
  }

  dateTime(name: string): ColumnBuilder {
    return this.add(name, DataTypes.DATE);
  }

  timestamp(name: string): ColumnBuilder {
    return this.dateTime(name);
  }

  /** created_at + updated_at (nullable, Sequelize fills them in). */
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
}
