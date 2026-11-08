import { definePack } from '../cli/index.js';
import { LimiterListCommand } from './commands/LimiterListCommand.js';
export default definePack({
    name: 'ratelimit',
    description: 'Rate limiter, throttle middleware and limiter:list',
    commands: [LimiterListCommand],
});
//# sourceMappingURL=pack.js.map