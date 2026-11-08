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
export declare class ColumnBuilder {
    readonly name: string;
    readonly type: string;
    private readonly blueprint;
    isNullable: boolean;
    hasDefault: boolean;
    defaultValue: unknown;
    isUnique: boolean;
    isPrimary: boolean;
    isAutoIncrement: boolean;
    foreign: ForeignKey | undefined;
    constructor(name: string, type: string, blueprint: Blueprint);
    /** Columns are NOT NULL unless you say otherwise. */
    nullable(value?: boolean): this;
    default(value: unknown): this;
    /** DEFAULT CURRENT_TIMESTAMP */
    useCurrent(): this;
    unique(): this;
    primary(): this;
    index(): this;
    references(table: string, column?: string): this;
    /** foreignId('user_id').constrained()  ->  references users.id (table guessed from the column name) */
    constrained(table?: string, column?: string): this;
    onDelete(action: ReferentialAction): this;
    onUpdate(action: ReferentialAction): this;
    cascadeOnDelete(): this;
    nullOnDelete(): this;
    /** The column definition as it appears in CREATE TABLE / ADD COLUMN. */
    sql(): string;
}
export declare class Blueprint {
    readonly table: string;
    readonly columns: ColumnBuilder[];
    readonly indexes: IndexDefinition[];
    constructor(table: string);
    private add;
    id(name?: string): ColumnBuilder;
    unsignedId(name?: string): ColumnBuilder;
    bigId(name?: string): ColumnBuilder;
    foreignId(name: string): ColumnBuilder;
    foreignUnsignedId(name: string): ColumnBuilder;
    foreignBigId(name: string): ColumnBuilder;
    foreignUuid(name: string): ColumnBuilder;
    uuid(name: string): ColumnBuilder;
    string(name: string, length?: number): ColumnBuilder;
    text(name: string): ColumnBuilder;
    integer(name: string): ColumnBuilder;
    bigInteger(name: string): ColumnBuilder;
    boolean(name: string): ColumnBuilder;
    /** Use for money: decimal('amount', 14, 2) */
    decimal(name: string, precision?: number, scale?: number): ColumnBuilder;
    float(name: string): ColumnBuilder;
    json(name: string): ColumnBuilder;
    enum(name: string, values: string[]): ColumnBuilder;
    /** Date only, no time. */
    date(name: string): ColumnBuilder;
    dateTime(name: string): ColumnBuilder;
    timestamp(name: string): ColumnBuilder;
    /** created_at + updated_at (nullable, filled in by your code). */
    timestamps(): void;
    softDeletes(name?: string): ColumnBuilder;
    index(fields: string | string[], options?: {
        name?: string;
    }): void;
    /** Composite unique constraint: t.unique(['user_id', 'wallet_id']). For one column use .unique() on it. */
    unique(fields: string | string[], options?: {
        name?: string;
    }): void;
    indexName(fields: string[], unique: boolean): string;
    private indexSql;
    private foreignSql;
    createSql(): string;
    /** One statement per change, for schema.table(). */
    alterSql(): string[];
}
export {};
//# sourceMappingURL=Blueprint.d.ts.map