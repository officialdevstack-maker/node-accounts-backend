// database/commands/MakeSeederCommand.ts
import { Command, appPath, className, displayPath, writeFileSafe } from '../../cli/index.js';
import { seederStub } from '../stubs.js';

export class MakeSeederCommand extends Command {
  readonly signature = 'make:seeder {name : e.g. UserSeeder or user} {--force : Overwrite if it exists}';
  readonly description = 'Create a new seeder in database/seeders';

  async handle(): Promise<number> {
    const { full } = className(this.argument('name')!, 'Seeder');
    const path = appPath('database', 'seeders', `${full}.ts`);

    const result = await writeFileSafe(path, seederStub(full), this.flag('force'));
    if (result === 'exists') {
      this.error(`${displayPath(path)} already exists. Use --force to overwrite.`);
      return 1;
    }

    this.success(`${full} ${result}: ${displayPath(path)}`);
    this.comment(`Run it with: artisan db:seed --class=${full}   (or call it from DatabaseSeeder)`);
    return 0;
  }
}
