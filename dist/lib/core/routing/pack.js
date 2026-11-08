// Found automatically by artisan (every <folder>/pack.ts next to cli/ is loaded). No registration needed.
import { definePack } from '../cli/index.js';
import { RouteListCommand } from './commands/RouteListCommand.js';
export default definePack({
    name: 'routing',
    description: 'Route facade and route:list',
    commands: [RouteListCommand],
});
//# sourceMappingURL=pack.js.map