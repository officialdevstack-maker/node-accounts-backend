// database/commands/MigrateFreshCommand.ts
import { Kernel } from '../../cli/index.js';
import { Database } from '../Database.js';
import { Migrator } from '../Migrator.js';
import { DatabaseCommand } from './DatabaseCommand.js';
import { reportEvent } from './report.js';
export class MigrateFreshCommand extends DatabaseCommand {
    signature = 'migrate:fresh {--seed : Run DatabaseSeeder afterwards} {--force : Run in production without asking}';
    description = 'DROP ALL TABLES, then run every migration again';
    async handle() {
        if (!(await this.confirmProduction()))
            return 1;
        const migrator = new Migrator(Database.connection(), { onEvent: (e) => reportEvent(this.io, e) });
        this.warn('Dropping all tables ...');
        await migrator.wipe();
        this.title('Running migrations');
        const ran = await migrator.run();
        this.newLine();
        this.success(`${ran.length} migration${ran.length === 1 ? '' : 's'} applied.`);
        if (this.flag('seed')) {
            this.newLine();
            // Reuses this connection; db:seed closes it when it finishes.
            return Kernel.call('db:seed', this.flag('force') ? ['--force'] : [], this.io);
        }
        return 0;
    }
}
//# sourceMappingURL=MigrateFreshCommand.js.map