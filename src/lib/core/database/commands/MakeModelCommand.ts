// database/commands/MakeModelCommand.ts
import { Command, CliError, Kernel, appPath, displayPath, toPascal, writeFileSafe } from '../../cli/index.js';
import { modelStub } from '../stubs.js';
import { pluralize, toSnake } from '../support.js';

export class MakeModelCommand extends Command {
  readonly signature =
    'make:model {name : e.g. Wallet or user-profile} {--m|migration : Also create the table migration} {--table= : Table name (default: plural snake_case)} {--force : Overwrite if it exists}';
  readonly description = 'Create a Sequelize model in database/models';

  async handle(): Promise<number> {
    const cls = toPascal(this.argument('name')!);
    if (!/^[A-Z][A-Za-z0-9]*$/.test(cls)) throw new CliError(`"${this.argument('name')}" is not a valid model name.`);

    const table = this.option('table') ?? pluralize(toSnake(cls));
    const path = appPath('database', 'models', `${cls}.ts`);

    const result = await writeFileSafe(path, modelStub(cls, table), this.flag('force'));
    if (result === 'exists') {
      this.error(`${displayPath(path)} already exists. Use --force to overwrite.`);
      return 1;
    }
    this.success(`${cls} ${result}: ${displayPath(path)}`);

    if (this.flag('migration')) return Kernel.call('make:migration', [`create_${table}_table`], this.io);
    return 0;
  }
}
