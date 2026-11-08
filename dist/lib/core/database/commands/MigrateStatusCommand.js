// database/commands/MigrateStatusCommand.ts
import { Database } from '../Database.js';
import { Migrator } from '../Migrator.js';
import { DatabaseCommand } from './DatabaseCommand.js';
export class MigrateStatusCommand extends DatabaseCommand {
    signature = 'migrate:status';
    description = 'Show which migrations have run';
    async handle() {
        const rows = await new Migrator(Database.connection()).status();
        if (!rows.length) {
            this.comment('No migration files found in database/migrations.');
            return 0;
        }
        this.table(['Ran?', 'Migration', 'Batch'], rows.map((r) => [r.ran ? 'Yes' : 'Pending', r.name, r.batch === undefined ? '' : String(r.batch)]));
        const pending = rows.filter((r) => !r.ran).length;
        this.newLine();
        this.comment(pending ? `${pending} pending. Run: artisan migrate` : 'Everything is up to date.');
        return 0;
    }
}
//# sourceMappingURL=MigrateStatusCommand.js.map