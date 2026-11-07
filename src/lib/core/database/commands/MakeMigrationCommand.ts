// database/commands/MakeMigrationCommand.ts
import { CliError, Command, appPath, displayPath, writeFileSafe } from '../../cli/index.js';
import { migrationStub, type MigrationKind } from '../stubs.js';
import { migrationTimestamp, toSnake } from '../support.js';

/** create_users_table -> create users ; add_phone_to_users_table -> alter users ; anything else -> blank */
export function inferMigration(name: string): { kind: MigrationKind; table?: string } {
  const create = name.match(/^create_(.+?)(?:_table)?$/);
  if (create) return { kind: 'create', ...(create[1] ? { table: create[1] } : {}) };

  const alter = name.match(/^(?:add|drop|remove|alter|update|change|modify|rename)_.+?_(?:to|from|in|on)_(.+?)(?:_table)?$/);
  if (alter) return { kind: 'alter', ...(alter[1] ? { table: alter[1] } : {}) };

  return { kind: 'blank' };
}

export class MakeMigrationCommand extends Command {
  readonly signature =
    'make:migration {name : e.g. create_wallets_table or add_phone_to_users_table} {--create= : Table to create} {--table= : Table to alter}';
  readonly description = 'Create a new migration file in database/migrations';

  async handle(): Promise<number> {
    const name = toSnake(this.argument('name')!);
    if (!name || !/^[a-z]/.test(name)) throw new CliError(`"${this.argument('name')}" is not a valid migration name.`);

    const create = this.option('create');
    const alter = this.option('table');
    if (create && alter) throw new CliError('Use either --create or --table, not both.');

    let plan = inferMigration(name);
    if (create) plan = { kind: 'create', table: toSnake(create) };
    if (alter) plan = { kind: 'alter', table: toSnake(alter) };

    const file = `${migrationTimestamp()}_${name}`;
    const path = appPath('database', 'migrations', `${file}.ts`);

    const result = await writeFileSafe(path, migrationStub(file, plan.kind, plan.table));
    if (result === 'exists') {
      this.error(`${displayPath(path)} already exists (two migrations in the same second? try again).`);
      return 1;
    }

    this.success(`Migration created: ${displayPath(path)}`);
    return 0;
  }
}
