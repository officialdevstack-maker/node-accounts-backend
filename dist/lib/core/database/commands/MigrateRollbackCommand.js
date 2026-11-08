// database/commands/MigrateRollbackCommand.ts
import { CliError } from '../../cli/index.js';
import { Database } from '../Database.js';
import { Migrator } from '../Migrator.js';
import { DatabaseCommand } from './DatabaseCommand.js';
import { reportEvent } from './report.js';
export class MigrateRollbackCommand extends DatabaseCommand {
    signature = 'migrate:rollback {--step= : Number of migrations to undo (default: the whole last batch)} {--force : Run in production without asking}';
    description = 'Undo the last batch of migrations';
    async handle() {
        let steps;
        const raw = this.option('step');
        if (raw !== undefined) {
            steps = Number(raw);
            if (!Number.isInteger(steps) || steps < 1)
                throw new CliError('--step must be a whole number of 1 or more.');
        }
        if (!(await this.confirmProduction()))
            return 1;
        const migrator = new Migrator(Database.connection(), { onEvent: (e) => reportEvent(this.io, e) });
        this.title('Rolling back migrations');
        const reverted = await migrator.rollback({ ...(steps !== undefined ? { steps } : {}) });
        if (!reverted.length) {
            this.info('Nothing to roll back.');
            return 0;
        }
        this.newLine();
        this.success(`${reverted.length} migration${reverted.length === 1 ? '' : 's'} reverted.`);
        return 0;
    }
}
//# sourceMappingURL=MigrateRollbackCommand.js.map