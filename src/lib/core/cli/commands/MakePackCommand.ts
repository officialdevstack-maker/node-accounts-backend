// cli/commands/MakePackCommand.ts
import { Command } from '../Command.js';
import { CliError } from '../Input.js';
import { packCommandStub, packIndexStub, packReadmeStub, packStub } from '../stubs.js';
import { appPath, displayPath, toKebab, toPascal, writeFileSafe } from '../support.js';

const RESERVED = ['cli', 'commands', 'config', 'node_modules', 'dist', 'build', 'coverage'];

export class MakePackCommand extends Command {
  readonly signature =
    'make:pack {name : Folder name, e.g. billing} {--description= : One line description} {--force : Overwrite files that already exist}';
  readonly description = 'Create a pack folder that artisan discovers automatically (pack.ts + commands/)';

  async handle(): Promise<number> {
    const name = toKebab(this.argument('name')!);
    if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new CliError(`"${this.argument('name')}" is not a valid pack name.`);
    if (RESERVED.includes(name)) throw new CliError(`"${name}" is reserved and cannot be a pack name.`);

    const pascal = toPascal(name);
    const options = { name, pascal, description: this.option('description') ?? `${pascal} pack` };
    const force = this.flag('force');

    // pack.ts is the one file that matters: never silently replace it.
    const manifest = appPath(name, 'pack.ts');
    const first = await writeFileSafe(manifest, packStub(options), force);
    if (first === 'exists') {
      this.error(`${displayPath(manifest)} already exists. Use --force to overwrite.`);
      return 1;
    }
    this.success(`Pack ${name} ${first}: ${displayPath(manifest)}`);

    // The rest are conveniences, so an existing folder (e.g. your mail/ pack) keeps what it already has.
    const extras: Array<[string, string]> = [
      [appPath(name, 'commands', `${pascal}InfoCommand.ts`), packCommandStub(options)],
      [appPath(name, 'index.ts'), packIndexStub(options)],
      [appPath(name, 'README.md'), packReadmeStub(options)],
    ];
    for (const [file, content] of extras) {
      const result = await writeFileSafe(file, content, force);
      if (result === 'exists') this.comment(`Kept existing ${displayPath(file)}`);
      else this.comment(`${result === 'created' ? 'Created' : 'Overwrote'} ${displayPath(file)}`);
    }

    this.newLine();
    this.comment(`Run it with: artisan ${name}:info   (see all packs: artisan pack:list)`);
    return 0;
  }
}
