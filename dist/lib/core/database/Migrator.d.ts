import { Connection } from '../query/Connection.js';
export interface MigrationFile {
    name: string;
    path: string;
}
export interface RanMigration {
    name: string;
    batch: number;
}
export interface MigrationStatus {
    name: string;
    ran: boolean;
    batch?: number;
}
export interface MigratorEvent {
    type: 'migrated' | 'reverted';
    name: string;
    ms: number;
}
export interface MigratorOptions {
    /** Folder with the migration files. Default: database/migrations */
    dir?: string;
    /** Tracking table. Default: config('database.migrationsTable') */
    table?: string;
    /** Called after each migration finishes, so the CLI can print progress live. */
    onEvent?: (event: MigratorEvent) => void;
}
export declare class MigrationError extends Error {
    readonly migration: string;
    readonly direction: 'up' | 'down';
    constructor(migration: string, direction: 'up' | 'down', cause: unknown);
}
export declare class Migrator {
    private readonly dir;
    private readonly table;
    private readonly db;
    private readonly schema;
    private readonly onEvent;
    private tableReady;
    constructor(connection: Connection, options?: MigratorOptions);
    /** Every migration file, oldest first (the timestamp prefix in the file name decides the order). */
    files(): Promise<MigrationFile[]>;
    /** Migrations already applied, in the order they ran. */
    ran(): Promise<RanMigration[]>;
    pending(): Promise<MigrationFile[]>;
    status(): Promise<MigrationStatus[]>;
    /**
     * Run every pending migration. All of them share one batch, so a single rollback undoes the whole run.
     * With `step`, each migration gets its own batch instead.
     * Returns the names that ran. Stops at the first failure; earlier ones stay applied and recorded.
     */
    run(options?: {
        step?: boolean;
    }): Promise<string[]>;
    /**
     * Undo the last batch, or the last `steps` migrations when given. Newest first.
     * Returns the names that were reverted.
     */
    rollback(options?: {
        steps?: number;
    }): Promise<string[]>;
    /** Undo every migration that has run. */
    reset(): Promise<string[]>;
    /** Drop every table in the database (including the migrations table). Follow it with run(). */
    wipe(): Promise<void>;
    private revert;
    private load;
    private lastBatch;
    /** CREATE TABLE IF NOT EXISTS, same columns the old Sequelize model produced. */
    private ensureTable;
}
//# sourceMappingURL=Migrator.d.ts.map