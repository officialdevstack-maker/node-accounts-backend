// database/Migration.ts
// Base class for files in database/migrations/. Generate one with:  artisan make:migration create_wallets_table
import type { Schema } from './Schema.js';

export abstract class Migration {
  /** Apply the change. */
  abstract up(schema: Schema): Promise<void> | void;

  /** Undo it exactly (used by migrate:rollback, migrate:reset). */
  abstract down(schema: Schema): Promise<void> | void;
}
