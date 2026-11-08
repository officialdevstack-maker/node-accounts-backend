// database/Migrator.ts
// Finds migration files, remembers which ones ran (in the `migrations` table), and runs / reverts them in batches.
// Bookkeeping goes through the query builder (DB) and the migrations table is created with Schema.
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../config/index.js';
import { Connection } from '../query/Connection.js';
import { Migration } from './Migration.js';
import { databasePath } from './paths.js';
import { Schema } from './Schema.js';
export class MigrationError extends Error {
    migration;
    direction;
    constructor(migration, direction, cause) {
        super(`Migration ${migration} failed on ${direction}(): ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
        this.migration = migration;
        this.direction = direction;
        this.name = 'MigrationError';
    }
}
export class Migrator {
    dir;
    table;
    db;
    schema;
    onEvent;
    tableReady = false;
    constructor(connection, options = {}) {
        this.table = options.table ?? config('database.migrationsTable');
        this.dir = options.dir ?? databasePath('migrations');
        this.onEvent = options.onEvent;
        this.schema = new Schema(connection);
        this.db = connection;
    }
    // ---- reading ---------------------------------------------------------------------------
    /** Every migration file, oldest first (the timestamp prefix in the file name decides the order). */
    async files() {
        let entries;
        try {
            entries = await readdir(this.dir);
        }
        catch {
            return [];
        }
        return entries
            .filter((f) => /\.(ts|js|mjs)$/.test(f) && !f.endsWith('.d.ts'))
            .sort()
            .map((f) => ({ name: f.replace(/\.(ts|js|mjs)$/, ''), path: join(this.dir, f) }));
    }
    /** Migrations already applied, in the order they ran. */
    async ran() {
        await this.ensureTable();
        const rows = await this.db.table(this.table).orderBy('batch').orderBy('id').get();
        return rows.map((r) => ({ name: String(r.migration), batch: Number(r.batch) }));
    }
    async pending() {
        const done = new Set((await this.ran()).map((r) => r.name));
        return (await this.files()).filter((f) => !done.has(f.name));
    }
    async status() {
        const batches = new Map((await this.ran()).map((r) => [r.name, r.batch]));
        const files = await this.files();
        const rows = files.map((f) => {
            const batch = batches.get(f.name);
            return { name: f.name, ran: batches.has(f.name), ...(batch !== undefined ? { batch } : {}) };
        });
        // Recorded as run but the file is gone: surface it instead of hiding it.
        const known = new Set(files.map((f) => f.name));
        for (const [name, batch] of batches)
            if (!known.has(name))
                rows.push({ name: `${name} (file missing)`, ran: true, batch });
        return rows;
    }
    // ---- writing ---------------------------------------------------------------------------
    /**
     * Run every pending migration. All of them share one batch, so a single rollback undoes the whole run.
     * With `step`, each migration gets its own batch instead.
     * Returns the names that ran. Stops at the first failure; earlier ones stay applied and recorded.
     */
    async run(options = {}) {
        const pending = await this.pending();
        if (!pending.length)
            return [];
        let batch = (await this.lastBatch()) + 1;
        const ran = [];
        for (const file of pending) {
            const migration = await this.load(file);
            const started = Date.now();
            try {
                await migration.up(this.schema);
            }
            catch (error) {
                throw new MigrationError(file.name, 'up', error);
            }
            await this.db.table(this.table).insert({ migration: file.name, batch });
            this.onEvent?.({ type: 'migrated', name: file.name, ms: Date.now() - started });
            ran.push(file.name);
            if (options.step)
                batch++;
        }
        return ran;
    }
    /**
     * Undo the last batch, or the last `steps` migrations when given. Newest first.
     * Returns the names that were reverted.
     */
    async rollback(options = {}) {
        const ran = await this.ran();
        if (!ran.length)
            return [];
        const targets = options.steps
            ? ran.slice(-options.steps)
            : ran.filter((r) => r.batch === Math.max(...ran.map((x) => x.batch)));
        return this.revert(targets.reverse());
    }
    /** Undo every migration that has run. */
    async reset() {
        return this.revert((await this.ran()).reverse());
    }
    /** Drop every table in the database (including the migrations table). Follow it with run(). */
    async wipe() {
        await this.schema.dropAllTables();
        this.tableReady = false;
    }
    // ---- internals -------------------------------------------------------------------------
    async revert(targets) {
        if (!targets.length)
            return [];
        // Check every file exists BEFORE touching the database, so we never stop half way for a missing file.
        const files = new Map((await this.files()).map((f) => [f.name, f]));
        const missing = targets.filter((t) => !files.has(t.name)).map((t) => t.name);
        if (missing.length) {
            throw new Error(`Cannot roll back, migration file not found: ${missing.join(', ')}`);
        }
        const reverted = [];
        for (const target of targets) {
            const migration = await this.load(files.get(target.name));
            const started = Date.now();
            try {
                await migration.down(this.schema);
            }
            catch (error) {
                throw new MigrationError(target.name, 'down', error);
            }
            await this.db.table(this.table).where('migration', target.name).delete();
            this.onEvent?.({ type: 'reverted', name: target.name, ms: Date.now() - started });
            reverted.push(target.name);
        }
        return reverted;
    }
    async load(file) {
        const module = (await import(pathToFileURL(file.path).href));
        const Class = module.default;
        if (typeof Class !== 'function' || !(Class.prototype instanceof Migration)) {
            throw new Error(`${file.name} must default-export a class that extends Migration.`);
        }
        return new Class();
    }
    async lastBatch() {
        await this.ensureTable();
        return Number((await this.db.table(this.table).max('batch')) ?? 0);
    }
    /** CREATE TABLE IF NOT EXISTS, same columns the old Sequelize model produced. */
    async ensureTable() {
        if (this.tableReady)
            return;
        if (!(await this.schema.hasTable(this.table))) {
            await this.schema.create(this.table, (t) => {
                t.id();
                t.string('migration', 255).unique();
                t.integer('batch');
            });
        }
        this.tableReady = true;
    }
}
//# sourceMappingURL=Migrator.js.map