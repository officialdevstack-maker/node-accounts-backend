// Found automatically by artisan (every <folder>/pack.ts next to cli/ is loaded). No registration needed.
import { definePack } from '../cli/index.js';
import { MakeControllerCommand } from './commands/MakeControllerCommand.js';

export default definePack({
  name: 'controller',
  description: 'Base Controller class (validate, respond, paginate, abort) and make:controller',
  commands: [MakeControllerCommand],
});
