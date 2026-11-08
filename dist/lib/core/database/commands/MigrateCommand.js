// database/commands/MigrateCommand.ts
import { Database } from '../Database.js';
import { Migrator } from '../Migrator.js';
import { DatabaseCommand } from './DatabaseCommand.js';
import { reportEvent } from './report.js';
export class MigrateCommand extends DatabaseCommand {
    signature = 'migrate {--step : Give each migration its own batch (rollback then undoes one at a time)} {--force : Run in production without asking}';
    description = 'Run the pending database migrations';
    async handle() {
        if (!(await this.confirmProduction()))
            return 1;
        const migrator = new Migrator(Database.connection(), { onEvent: (e) => reportEvent(this.io, e) });
        if (!(await migrator.pending()).length) {
            this.info('Nothing to migrate.');
            return 0;
        }
        this.title('Running migrations');
        const ran = await migrator.run({ step: this.flag('step') });
        this.newLine();
        this.success(`${ran.length} migration${ran.length === 1 ? '' : 's'} applied.`);
        return 0;
    }
}
//# sourceMappingURL=MigrateCommand.js.map