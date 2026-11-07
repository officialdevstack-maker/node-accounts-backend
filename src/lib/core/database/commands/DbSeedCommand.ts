// database/commands/DbSeedCommand.ts
import { Database } from '../Database.js';
import { loadSeeder } from '../Seeder.js';
import { DatabaseCommand } from './DatabaseCommand.js';

export class DbSeedCommand extends DatabaseCommand {
  readonly signature =
    'db:seed {--class=DatabaseSeeder : Seeder class to run (file name in database/seeders)} {--force : Run in production without asking}';
  readonly description = 'Seed the database with records';

  async handle(): Promise<number> {
    if (!(await this.confirmProduction())) return 1;

    const name = this.option('class')!;
    const Seeder = await loadSeeder(name);

    await Database.boot(); // models in database/models are usable inside seeders
    this.comment(`Seeding: ${name}`);
    await new Seeder().run();

    this.success(`${name} finished.`);
    return 0;
  }
}
