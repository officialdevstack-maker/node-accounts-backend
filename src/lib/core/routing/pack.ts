// Found automatically by artisan (every <folder>/pack.ts next to cli/ is loaded). No registration needed.
import { definePack } from '../cli/index.js';
import { MakeControllerCommand } from './commands/MakeControllerCommand.js';
import { RouteListCommand } from './commands/RouteListCommand.js';

export default definePack({
  name: 'routing',
  description: 'Route facade, route:list and make:controller',
  commands: [RouteListCommand, MakeControllerCommand],
});
