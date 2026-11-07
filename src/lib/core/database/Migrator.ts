// database/Migrator.ts
// Finds migration files, remembers which ones ran (in the `migrations` table), and runs / reverts them in batches.
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DataTypes, type Model, type ModelStatic, type Sequelize } from 'sequelize';
import { config } from '../config/index.js';
import { Migration } from './Migration.js';
import { databasePath } from './paths.js';
import { Schema } from './Schema.js';

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

export class MigrationError extends Error {
  constructor(
    readonly migration: string,
    readonly direction: 'up' | 'down',
    cause: unknown,
  ) {
    super(`Migration ${migration} failed on ${direction}(): ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    this.name = 'MigrationError';
  }
}

export class Migrator {
  private readonly dir: string;
  private readonly record: ModelStatic<Model>;
  private readonly schema: Schema;
  private readonly onEvent?: (event: MigratorEvent) => void;

  constructor(
    sequelize: Sequelize,
    options: MigratorOptions = {},
  ) {
    const table = options.table ?? config('database.migrationsTable');
    this.dir = options.dir ?? databasePath('migrations');
    this.onEvent = options.onEvent;
    this.schema = new Schema(sequelize);

    this.record = sequelize.define(
      `Migrator_${table}`,
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        migration: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        batch: { type: DataTypes.INTEGER, allowNull: false },
      },
      { tableName: table, timestamps: false },
    );
  }

  // ---- reading ---------------------------------------------------------------------------
  /** Every migration file, oldest first (the timestamp prefix in the file name decides the order). */
  async files(): Promise<MigrationFile[]> {
    let entries: string[];
    try {
      entries = await readdir(this.dir);
    } catch {
      return [];
    }

    return entries
      .filter((f) => /\.(ts|js|mjs)$/.test(f) && !f.endsWith('.d.ts'))
      .sort()
      .map((f) => ({ name: f.replace(/\.(ts|js|mjs)$/, ''), path: join(this.dir, f) }));
  }

  /** Migrations already applied, in the order they ran. */
  async ran(): Promise<RanMigration[]> {
    await this.ensureTable();
    const rows = (await this.record.findAll({ order: [['batch', 'ASC'], ['id', 'ASC']], raw: true })) as unknown as Array<{
      migration: string;
      batch: number;
    }>;
    return rows.map((r) => ({ name: r.migration, batch: Number(r.batch) }));
  }

  async pending(): Promise<MigrationFile[]> {
    const done = new Set((await this.ran()).map((r) => r.name));
    return (await this.files()).filter((f) => !done.has(f.name));
  }

  async status(): Promise<MigrationStatus[]> {
    const batches = new Map((await this.ran()).map((r) => [r.name, r.batch]));
    const files = await this.files();
    const rows: MigrationStatus[] = files.map((f) => ({ name: f.name, ran: batches.has(f.name), batch: batches.get(f.name) }));

    // Recorded as run but the file is gone: surface it instead of hiding it.
    const known = new Set(files.map((f) => f.name));
    for (const [name, batch] of batches) if (!known.has(name)) rows.push({ name: `${name} (file missing)`, ran: true, batch });
    return rows;
  }

  // ---- writing ---------------------------------------------------------------------------
  /**
   * Run every pending migration. All of them share one batch, so a single rollback undoes the whole run.
   * With `step`, each migration gets its own batch instead.
   * Returns the names that ran. Stops at the first failure; earlier ones stay applied and recorded.
   */
  async run(options: { step?: boolean } = {}): Promise<string[]> {
    const pending = await this.pending();
    if (!pending.length) return [];

    let batch = (await this.lastBatch()) + 1;
    const ran: string[] = [];

    for (const file of pending) {
      const migration = await this.load(file);
      const started = Date.now();

      try {
        await migration.up(this.schema);
      } catch (error) {
        throw new MigrationError(file.name, 'up', error);
      }

      await this.record.create({ migration: file.name, batch });
      this.onEvent?.({ type: 'migrated', name: file.name, ms: Date.now() - started });
      ran.push(file.name);

      if (options.step) batch++;
    }
    return ran;
  }

  /**
   * Undo the last batch, or the last `steps` migrations when given. Newest first.
   * Returns the names that were reverted.
   */
  async rollback(options: { steps?: number } = {}): Promise<string[]> {
    const ran = await this.ran();
    if (!ran.length) return [];

    const targets = options.steps
      ? ran.slice(-options.steps)
      : ran.filter((r) => r.batch === Math.max(...ran.map((x) => x.batch)));

    return this.revert(targets.reverse());
  }

  /** Undo every migration that has run. */
  async reset(): Promise<string[]> {
    return this.revert((await this.ran()).reverse());
  }

  /** Drop every table in the database (including the migrations table). Follow it with run(). */
  async wipe(): Promise<void> {
    await this.schema.queryInterface.dropAllTables();
  }

  // ---- internals -------------------------------------------------------------------------
  private async revert(targets: RanMigration[]): Promise<string[]> {
    if (!targets.length) return [];

    // Check every file exists BEFORE touching the database, so we never stop half way for a missing file.
    const files = new Map((await this.files()).map((f) => [f.name, f]));
    const missing = targets.filter((t) => !files.has(t.name)).map((t) => t.name);
    if (missing.length) {
      throw new Error(`Cannot roll back, migration file not found: ${missing.join(', ')}`);
    }

    const reverted: string[] = [];
    for (const target of targets) {
      const migration = await this.load(files.get(target.name)!);
      const started = Date.now();

      try {
        await migration.down(this.schema);
      } catch (error) {
        throw new MigrationError(target.name, 'down', error);
      }

      await this.record.destroy({ where: { migration: target.name } });
      this.onEvent?.({ type: 'reverted', name: target.name, ms: Date.now() - started });
      reverted.push(target.name);
    }
    return reverted;
  }

  private async load(file: MigrationFile): Promise<Migration> {
    const module = (await import(pathToFileURL(file.path).href)) as { default?: unknown };
    const Class = module.default;

    if (typeof Class !== 'function' || !(Class.prototype instanceof Migration)) {
      throw new Error(`${file.name} must default-export a class that extends Migration.`);
    }
    return new (Class as new () => Migration)();
  }

  private async lastBatch(): Promise<number> {
    const ran = await this.ran();
    return ran.length ? Math.max(...ran.map((r) => r.batch)) : 0;
  }

  private async ensureTable(): Promise<void> {
    await this.record.sync(); // CREATE TABLE IF NOT EXISTS
  }
}
