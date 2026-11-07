// database/commands/DbVerifyCommand.ts
import { config } from '../../config/index.js';
import { Database } from '../Database.js';
import { DatabaseCommand } from './DatabaseCommand.js';

export class DbVerifyCommand extends DatabaseCommand {
  readonly signature = 'db:verify';
  readonly description = 'Check the database connection and credentials';

  async handle(): Promise<number> {
    const driver = config('database.default');
    const target =
      driver === 'sqlite'
        ? config('database.storage')
        : `${config('database.host')}:${config('database.port')}/${config('database.name')} as ${config('database.username')}`;

    this.comment(`Connecting to ${driver} (${target}) ...`);

    try {
      await Database.authenticate();
      this.success(`Database [${driver}] is ready.`);
      return 0;
    } catch (error) {
      this.error(`Database [${driver}] failed: ${error instanceof Error ? error.message : String(error)}`);
      return 1;
    }
  }
}
