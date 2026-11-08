import type { Connection } from '../query/Connection.js';
import { Blueprint } from './Blueprint.js';
export declare class Schema {
    readonly connection: Connection;
    constructor(connection: Connection);
    /** CREATE TABLE */
    create(table: string, build: (blueprint: Blueprint) => void): Promise<void>;
    /** ALTER TABLE ... ADD COLUMN for every column in the blueprint (plus indexes and foreign keys). */
    table(table: string, build: (blueprint: Blueprint) => void): Promise<void>;
    drop(table: string): Promise<void>;
    dropIfExists(table: string): Promise<void>;
    /** DROP every table in the database. */
    dropAllTables(): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    dropColumn(table: string, column: string): Promise<void>;
    renameColumn(table: string, from: string, to: string): Promise<void>;
    /** Pass the index name, or the column list for an index created without a custom name. */
    dropIndex(table: string, nameOrFields: string | string[]): Promise<void>;
    hasTable(table: string): Promise<boolean>;
    hasColumn(table: string, column: string): Promise<boolean>;
    /** Run a raw SQL statement. */
    raw(sql: string): Promise<void>;
}
//# sourceMappingURL=Schema.d.ts.map