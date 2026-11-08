import { DatabaseCommand } from './DatabaseCommand.js';
export declare class DbSeedCommand extends DatabaseCommand {
    readonly signature = "db:seed {--class=DatabaseSeeder : Seeder class to run (file name in database/seeders)} {--force : Run in production without asking}";
    readonly description = "Seed the database with records";
    handle(): Promise<number>;
}
//# sourceMappingURL=DbSeedCommand.d.ts.map