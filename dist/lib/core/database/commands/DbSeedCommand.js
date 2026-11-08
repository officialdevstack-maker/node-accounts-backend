// database/commands/DbSeedCommand.ts
import { loadSeeder } from '../Seeder.js';
import { DatabaseCommand } from './DatabaseCommand.js';
export class DbSeedCommand extends DatabaseCommand {
    signature = 'db:seed {--class=DatabaseSeeder : Seeder class to run (file name in database/seeders)} {--force : Run in production without asking}';
    description = 'Seed the database with records';
    async handle() {
        if (!(await this.confirmProduction()))
            return 1;
        const name = this.option('class');
        const Seeder = await loadSeeder(name);
        this.comment(`Seeding: ${name}`);
        await new Seeder().run();
        this.success(`${name} finished.`);
        return 0;
    }
}
//# sourceMappingURL=DbSeedCommand.js.map