import { Command } from '../../cli/index.js';
export declare class MakeSeederCommand extends Command {
    readonly signature = "make:seeder {name : e.g. UserSeeder or user} {--force : Overwrite if it exists}";
    readonly description = "Create a new seeder in database/seeders";
    handle(): Promise<number>;
}
//# sourceMappingURL=MakeSeederCommand.d.ts.map