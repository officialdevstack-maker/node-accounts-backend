// database/commands/DbVerifyCommand.ts
import { config } from '../../config/index.js';
import { Database } from '../Database.js';
import { DatabaseCommand } from './DatabaseCommand.js';
export class DbVerifyCommand extends DatabaseCommand {
    signature = 'db:verify';
    description = 'Check the database connection and credentials';
    async handle() {
        const target = `${config('database.host')}:${config('database.port')}/${config('database.name')} as ${config('database.username')}`;
        this.comment(`Connecting to mysql (${target}) ...`);
        try {
            await Database.authenticate();
            this.success('Database is ready.');
            return 0;
        }
        catch (error) {
            this.error(`Database failed: ${error instanceof Error ? error.message : String(error)}`);
            return 1;
        }
    }
}
//# sourceMappingURL=DbVerifyCommand.js.map