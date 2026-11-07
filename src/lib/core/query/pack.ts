import { definePack } from '../cli/index.js';
import { DbTableCommand } from './commands/DbTableCommand.js';
import { QueryCheckCommand } from './commands/QueryCheckCommand.js';

export default definePack({
  name: 'query',
  description: 'Query builder with MySQL / Postgres / SQLite grammars (the DB facade)',
  commands: [DbTableCommand, QueryCheckCommand],
});
