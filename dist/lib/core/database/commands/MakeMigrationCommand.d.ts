import { Command } from '../../cli/index.js';
import { type MigrationKind } from '../stubs.js';
/** create_users_table -> create users ; add_phone_to_users_table -> alter users ; anything else -> blank */
export declare function inferMigration(name: string): {
    kind: MigrationKind;
    table?: string;
};
export declare class MakeMigrationCommand extends Command {
    readonly signature = "make:migration {name : e.g. create_wallets_table or add_phone_to_users_table} {--create= : Table to create} {--table= : Table to alter}";
    readonly description = "Create a new migration file in database/migrations";
    handle(): Promise<number>;
}
//# sourceMappingURL=MakeMigrationCommand.d.ts.map