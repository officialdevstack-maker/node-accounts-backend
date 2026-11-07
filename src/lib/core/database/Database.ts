// database/Database.ts
// One shared Sequelize connection built from config/database.ts (Laravel's DB facade, roughly).
//
//   const sequelize = await Database.boot(initDatabaseNotification);   // once, at app start
//   Database.connection()                                              // anywhere afterwards
//
// Install the driver for your DB_CONNECTION:  npm i sequelize mysql2 | pg | sqlite3
import { readdir } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Model, Sequelize, type ModelStatic, type Options } from 'sequelize';
import { config } from '../config/index.js';
import { databasePath } from './paths.js';

/** A function that calls Model.init(...) for one model, e.g. initUser or initDatabaseNotification. */
export type ModelInitializer = (sequelize: Sequelize) => unknown;

type AssociableModel = ModelStatic<Model> & {
  associate?: (models: Record<string, ModelStatic<Model>>) => void;
};

export class Database {
  private static sequelize: Sequelize | undefined;
  private static booted = false;
  private static readonly initialized = new Set<ModelInitializer>();
  private static readonly associated = new Set<string>();

  /** Every model initialised so far, by class name: Database.models.User */
  static readonly models: Record<string, ModelStatic<Model>> = {};

  /** The shared connection. Created lazily, nothing connects until the first query. */
  static connection(): Sequelize {
    if (this.sequelize) return this.sequelize;

    const dialect = config('database.default');
    const pool = config('database.pool');

    const common: Options = {
      dialect,
      logging: config('database.logging') ? (sql: string) => console.log(sql) : false,
      pool: { max: pool.max, min: pool.min, idle: pool.idleMs, acquire: pool.acquireMs },
      // Columns are snake_case (created_at, notifiable_id), matching what the migrations create.
      define: { underscored: true },
    };

    this.sequelize =
      dialect === 'sqlite'
        ? new Sequelize({ ...common, storage: config('database.storage') })
        : new Sequelize(config('database.name'), config('database.username'), config('database.password'), {
            ...common,
            host: config('database.host'),
            port: config('database.port'),
            // SQLite rejects a custom timezone, so it is only set for MySQL / Postgres.
            timezone: config('database.timezone'),
          });

    return this.sequelize;
  }

  /**
   * Initialise models and link their associations. Safe to call more than once.
   * Besides the initializers you pass in, every file in database/models/ is loaded and its
   * `init<FileName>(sequelize)` function is called (make:model generates that function).
   */
  static async boot(...initializers: ModelInitializer[]): Promise<Sequelize> {
    const sequelize = this.connection();

    for (const initializer of initializers) this.initialize(initializer, sequelize);

    if (!this.booted) {
      this.booted = true;
      await this.discoverModels(sequelize);
    }

    this.associate();
    return sequelize;
  }

  /** Throws if the database can't be reached or the credentials are wrong. */
  static async authenticate(): Promise<void> {
    await this.connection().authenticate();
  }

  static async close(): Promise<void> {
    if (!this.sequelize) return;
    const sequelize = this.sequelize;

    this.sequelize = undefined;
    this.booted = false;
    this.initialized.clear();
    this.associated.clear();
    for (const key of Object.keys(this.models)) delete this.models[key];

    await sequelize.close();
  }

  // ---- internals -------------------------------------------------------------------------
  private static initialize(initializer: ModelInitializer, sequelize: Sequelize): void {
    if (this.initialized.has(initializer)) return;
    this.initialized.add(initializer);

    const model = initializer(sequelize);
    if (typeof model === 'function' && model.prototype instanceof Model) {
      this.models[model.name] = model as ModelStatic<Model>;
    }
  }

  private static async discoverModels(sequelize: Sequelize): Promise<void> {
    const dir = databasePath('models');

    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      return; // no models folder yet
    }

    for (const file of files.sort()) {
      if (!/\.(ts|js|mjs)$/.test(file) || file.endsWith('.d.ts')) continue;

      const stem = basename(file, extname(file));
      const module = (await import(pathToFileURL(databasePath('models', file)).href)) as Record<string, unknown>;
      const initializer = module[`init${stem}`];

      if (typeof initializer === 'function') this.initialize(initializer as ModelInitializer, sequelize);
    }
  }

  /** Calls `static associate(models)` on each model once all of them exist (the usual Sequelize pattern). */
  private static associate(): void {
    for (const [name, model] of Object.entries(this.models) as Array<[string, AssociableModel]>) {
      if (this.associated.has(name)) continue;
      this.associated.add(name);
      if (typeof model.associate === 'function') model.associate(this.models);
    }
  }
}
