// database/commands/MigrateResetCommand.ts
import { Database } from '../Database.js';
import { Migrator } from '../Migrator.js';
import { DatabaseCommand } from './DatabaseCommand.js';
import { reportEvent } from './report.js';

export class MigrateResetCommand extends DatabaseCommand {
  readonly signature = 'migrate:reset {--force : Run in production without asking}';
  readonly description = 'Undo every migration (runs each down())';

  async handle(): Promise<number> {
    if (!(await this.confirmProduction())) return 1;

    const migrator = new Migrator(Database.connection(), { onEvent: (e) => reportEvent(this.io, e) });

    this.title('Reverting all migrations');
    const reverted = await migrator.reset();

    if (!reverted.length) {
      this.info('Nothing to reset.');
      return 0;
    }
    this.newLine();
    this.success(`${reverted.length} migration${reverted.length === 1 ? '' : 's'} reverted.`);
    return 0;
  }
}
