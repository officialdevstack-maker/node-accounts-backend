import { Raw } from '../query/Raw.js';
import { pluralize, quoteId, quoteValue } from './support.js';
/** Returned by every column method so modifiers can be chained: t.string('email', 120).nullable().unique() */
export class ColumnBuilder {
    name;
    type;
    blueprint;
    isNullable = false;
    hasDefault = false;
    defaultValue = null;
    isUnique = false;
    isPrimary = false;
    isAutoIncrement = false;
    foreign = undefined;
    constructor(name, type, blueprint) {
        this.name = name;
        this.type = type;
        this.blueprint = blueprint;
    }
    /** Columns are NOT NULL unless you say otherwise. */
    nullable(value = true) {
        this.isNullable = value;
        return this;
    }
    default(value) {
        this.hasDefault = true;
        this.defaultValue = value;
        return this;
    }
    /** DEFAULT CURRENT_TIMESTAMP */
    useCurrent() {
        return this.default(new Raw('CURRENT_TIMESTAMP'));
    }
    unique() {
        this.isUnique = true;
        return this;
    }
    primary() {
        this.isPrimary = true;
        this.isNullable = false;
        return this;
    }
    index() {
        this.blueprint.index(this.name);
        return this;
    }
    references(table, column = 'id') {
        this.foreign = { ...this.foreign, table, column };
        return this;
    }
    /** foreignId('user_id').constrained()  ->  references users.id (table guessed from the column name) */
    constrained(table, column = 'id') {
        return this.references(table ?? pluralize(this.name.replace(/_id$/, '')), column);
    }
    onDelete(action) {
        if (this.foreign)
            this.foreign.onDelete = action;
        return this;
    }
    onUpdate(action) {
        if (this.foreign)
            this.foreign.onUpdate = action;
        return this;
    }
    cascadeOnDelete() {
        return this.onDelete('CASCADE');
    }
    nullOnDelete() {
        this.isNullable = true;
        return this.onDelete('SET NULL');
    }
    /** The column definition as it appears in CREATE TABLE / ADD COLUMN. */
    sql() {
        const parts = [quoteId(this.name), this.type, this.isNullable ? 'NULL' : 'NOT NULL'];
        if (this.hasDefault)
            parts.push(`DEFAULT ${quoteValue(this.defaultValue)}`);
        if (this.isAutoIncrement)
            parts.push('AUTO_INCREMENT');
        if (this.isUnique)
            parts.push('UNIQUE');
        return parts.join(' ');
    }
}
export class Blueprint {
    table;
    columns = [];
    indexes = [];
    constructor(table) {
        this.table = table;
    }
    add(name, type, opts = {}) {
        const column = new ColumnBuilder(name, type, this);
        if (opts.primary)
            column.primary();
        if (opts.autoIncrement)
            column.isAutoIncrement = true;
        this.columns.push(column);
        return column;
    }
    // ---- keys -------------------------------------------------------------------------------
    id(name = 'id') {
        return this.add(name, 'INT', { primary: true, autoIncrement: true });
    }
    unsignedId(name = 'id') {
        return this.add(name, 'INT UNSIGNED', { primary: true, autoIncrement: true });
    }
    bigId(name = 'id') {
        return this.add(name, 'BIGINT', { primary: true, autoIncrement: true });
    }
    foreignId(name) {
        return this.add(name, 'INT');
    }
    foreignUnsignedId(name) {
        return this.add(name, 'INT UNSIGNED');
    }
    foreignBigId(name) {
        return this.add(name, 'BIGINT');
    }
    foreignUuid(name) {
        return this.uuid(name);
    }
    uuid(name) {
        return this.add(name, 'CHAR(36)');
    }
    // ---- columns ----------------------------------------------------------------------------
    string(name, length = 255) {
        return this.add(name, `VARCHAR(${Math.trunc(length)})`);
    }
    text(name) {
        return this.add(name, 'TEXT');
    }
    integer(name) {
        return this.add(name, 'INT');
    }
    bigInteger(name) {
        return this.add(name, 'BIGINT');
    }
    boolean(name) {
        return this.add(name, 'TINYINT(1)');
    }
    /** Use for money: decimal('amount', 14, 2) */
    decimal(name, precision = 10, scale = 2) {
        return this.add(name, `DECIMAL(${Math.trunc(precision)}, ${Math.trunc(scale)})`);
    }
    float(name) {
        return this.add(name, 'FLOAT');
    }
    json(name) {
        return this.add(name, 'JSON');
    }
    enum(name, values) {
        return this.add(name, `ENUM(${values.map(quoteValue).join(', ')})`);
    }
    /** Date only, no time. */
    date(name) {
        return this.add(name, 'DATE');
    }
    dateTime(name) {
        return this.add(name, 'DATETIME');
    }
    timestamp(name) {
        return this.dateTime(name);
    }
    /** created_at + updated_at (nullable, filled in by your code). */
    timestamps() {
        this.dateTime('created_at').nullable();
        this.dateTime('updated_at').nullable();
    }
    softDeletes(name = 'deleted_at') {
        return this.dateTime(name).nullable();
    }
    // ---- indexes ----------------------------------------------------------------------------
    index(fields, options = {}) {
        this.indexes.push({ fields: [fields].flat(), unique: false, name: options.name });
    }
    /** Composite unique constraint: t.unique(['user_id', 'wallet_id']). For one column use .unique() on it. */
    unique(fields, options = {}) {
        this.indexes.push({ fields: [fields].flat(), unique: true, name: options.name });
    }
    // ---- compiling --------------------------------------------------------------------------
    indexName(fields, unique) {
        return `${this.table}_${fields.join('_')}_${unique ? 'unique' : 'index'}`;
    }
    indexSql(index) {
        const name = quoteId(index.name ?? this.indexName(index.fields, index.unique));
        return `${index.unique ? 'UNIQUE ' : ''}KEY ${name} (${index.fields.map(quoteId).join(', ')})`;
    }
    foreignSql(column) {
        const f = column.foreign;
        if (!f)
            return undefined;
        let sql = `CONSTRAINT ${quoteId(`${this.table}_${column.name}_foreign`)} FOREIGN KEY (${quoteId(column.name)}) REFERENCES ${quoteId(f.table)} (${quoteId(f.column)})`;
        if (f.onDelete)
            sql += ` ON DELETE ${f.onDelete}`;
        if (f.onUpdate)
            sql += ` ON UPDATE ${f.onUpdate}`;
        return sql;
    }
    createSql() {
        const primary = this.columns.filter((c) => c.isPrimary).map((c) => quoteId(c.name));
        const lines = [
            ...this.columns.map((c) => c.sql()),
            ...(primary.length ? [`PRIMARY KEY (${primary.join(', ')})`] : []),
            ...this.indexes.map((i) => this.indexSql(i)),
            ...this.columns.map((c) => this.foreignSql(c)).filter((s) => Boolean(s)),
        ];
        return `CREATE TABLE ${quoteId(this.table)} (\n  ${lines.join(',\n  ')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
    }
    /** One statement per change, for schema.table(). */
    alterSql() {
        const alter = `ALTER TABLE ${quoteId(this.table)}`;
        return [
            ...this.columns.map((c) => `${alter} ADD COLUMN ${c.sql()}`),
            ...this.indexes.map((i) => `${alter} ADD ${this.indexSql(i)}`),
            ...this.columns.map((c) => this.foreignSql(c)).filter((s) => Boolean(s)).map((s) => `${alter} ADD ${s}`),
        ];
    }
}
//# sourceMappingURL=Blueprint.js.map