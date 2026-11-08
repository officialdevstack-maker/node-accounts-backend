import { dirname, join, relative, sep } from 'node:path';
import { CliError, Command, displayPath, Kernel, toPascal, writeFileSafe } from '../../cli/index.js';
import { pluralize, toSnake } from '../../database/support.js';
import { modelStub } from '../stubs.js';

export class MakeModelCommand extends Command {
  readonly signature =
    'make:model {name : e.g. Wallet or Billing/Invoice} {--m|migration : Also create the create_<table>_table migration} {--force : Overwrite if it exists}';
  readonly description = 'Create a model in src/models';

  async handle(): Promise<number> {
    const raw = this.argument('name')!;
    const segments = raw.split(/[\\/]/).filter(Boolean);
    const last = segments.pop();
    const folders = segments.map(toPascal);
    const cls = last ? toPascal(last) : '';
    if (!cls || !/^[A-Za-z]/.test(cls)) throw new CliError(`"${raw}" is not a valid model name.`);

    const table = pluralize(toSnake(cls));
    const file = join(process.cwd(), 'src', 'models', ...folders, `${cls}.ts`);
    const importPath = relative(dirname(file), join(process.cwd(), 'src', 'lib', 'core', 'model', 'index.js'))
      .split(sep)
      .join('/')
      .replace(/^([^./])/, './$1');

    const result = await writeFileSafe(file, modelStub(cls, table, importPath), this.flag('force'));
    if (result === 'exists') {
      this.error(`${displayPath(file)} already exists. Use --force to overwrite.`);
      return 1;
    }
    this.success(`${cls} ${result}: ${displayPath(file)}`);

    if (this.flag('migration')) return Kernel.call('make:migration', [`create_${table}_table`], this.io);
    return 0;
  }
}
