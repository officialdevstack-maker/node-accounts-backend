# Database pack (Laravel-style migrations and seeders)

Supports MySQL, PostgreSQL, and SQLite. Needs the `config/` and `cli/` packs. Registers its commands with artisan by itself (`database/pack.ts`).

## Install
```bash
npm i mysql2 pg
```
Set `DB_CONNECTION` to `mysql`, `pgsql`, or `sqlite`. For MySQL and PostgreSQL, configure `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, and `DB_PASSWORD`; set `DB_SSL=true` when the provider requires TLS. SQLite uses `DB_SQLITE_PATH`. Then:
```bash
npm run artisan -- db:verify    # can we connect?
npm run artisan -- migrate      # creates the notifications table (and anything you add)
```

## Boot
```ts
import { Database } from './database/index.js';

await Database.authenticate();
// anywhere else: Database.connection()
```
The database service provider authenticates the connection during application startup.

## Migrations
```bash
artisan make:migration create_wallets_table          # create stub, table name inferred
artisan make:migration add_phone_to_users_table      # alter stub
artisan make:migration whatever --create=wallets     # or force it with --create / --table
artisan migrate [--step]                             # run pending (one batch, or one batch each with --step)
artisan migrate:rollback [--step=N]                  # undo the last batch, or the last N migrations
artisan migrate:reset                                # undo everything
artisan migrate:fresh [--seed]                       # DROP ALL TABLES, migrate again
artisan migrate:status
```
```ts

// database/migrations/2026_11_07_103000_create_wallets_table.ts
export default class extends Migration {
  async up(schema: Schema) {
    await schema.create('wallets', (t) => {
      t.id();
      t.foreignId('user_id').constrained().cascadeOnDelete();   // -> users.id
      t.decimal('balance', 14, 2).default(0);
      t.string('currency', 3).default('NGN');
      t.json('meta').nullable();
      t.timestamps();
      t.unique(['user_id', 'currency']);
    });
  }
  async down(schema: Schema) { await schema.dropIfExists('wallets'); }
}
```
| Column | | Modifiers (chain them) |
|---|---|---|
| `id()` `bigId()` | auto-increment key | `nullable()` `default(v)` `useCurrent()` |
| `foreignId()` `foreignBigId()` `foreignUuid()` | foreign key column | `unique()` `primary()` `index()` |
| `uuid()` `string(n)` `text()` | | `references(table, col)` `constrained()` |
| `integer()` `bigInteger()` `decimal(p, s)` `float()` | use `decimal` for money | `onDelete(a)` `onUpdate(a)` `cascadeOnDelete()` `nullOnDelete()` |
| `boolean()` `json()` `enum(values)` | | |
| `date()` `dateTime()` `timestamp()` | | |
| `timestamps()` `softDeletes()` | `created_at`/`updated_at`, `deleted_at` | |

Columns are `NOT NULL` unless you add `.nullable()`. Table-level: `t.index([...])`, `t.unique([...])`.
Schema: `create` `table` (add columns to an existing table) `drop` `dropIfExists` `rename` `dropColumn` `renameColumn`
`dropIndex` `hasTable` `hasColumn` and `raw(sql)`. Schema operations use the selected database dialect.

Files run oldest first, ordered by the timestamp in the file name. Applied migrations are recorded in the `migrations` table
(`DB_MIGRATIONS_TABLE`). Never edit a migration that already ran in production: add a new one.

Notes:
- MySQL and PostgreSQL commit DDL immediately, so a migration that fails part way is not undone. Keep each migration small.
- In production `migrate*` asks for confirmation; with no terminal (CI) it refuses unless you pass `--force`.
- `rollback` refuses, before changing anything, if a recorded migration's file has been deleted.

## Models
See the [model pack](../model/README.md) for active-record-style models, attribute casting, hidden fields, lifecycle hooks, soft deletes, and the `make:model` command.

## Seeders
```bash
artisan make:seeder UserSeeder
artisan db:seed [--class=UserSeeder]        # default: DatabaseSeeder
artisan migrate:fresh --seed
```
```ts
export class DatabaseSeeder extends Seeder {
  async run() { await this.call(UserSeeder, WalletSeeder); }
}
```
The file name must match the class name (`database/seeders/UserSeeder.ts` exports `UserSeeder`).
