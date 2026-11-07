// database/pack.ts
// Registers the database commands with artisan (found automatically, see cli/Pack.ts).
import { definePack } from '../cli/index.js';
import { DbSeedCommand } from './commands/DbSeedCommand.js';
import { DbVerifyCommand } from './commands/DbVerifyCommand.js';
import { MakeMigrationCommand } from './commands/MakeMigrationCommand.js';
import { MakeSeederCommand } from './commands/MakeSeederCommand.js';
import { MigrateCommand } from './commands/MigrateCommand.js';
import { MigrateFreshCommand } from './commands/MigrateFreshCommand.js';
import { MigrateResetCommand } from './commands/MigrateResetCommand.js';
import { MigrateRollbackCommand } from './commands/MigrateRollbackCommand.js';
import { MigrateStatusCommand } from './commands/MigrateStatusCommand.js';

export default definePack({
  name: 'database',
  description: 'MySQL connection, migrations and seeders',
  commands: [
    MigrateCommand,
    MigrateRollbackCommand,
    MigrateResetCommand,
    MigrateFreshCommand,
    MigrateStatusCommand,
    DbSeedCommand,
    DbVerifyCommand,
    MakeMigrationCommand,
    MakeSeederCommand,
  ],
});
