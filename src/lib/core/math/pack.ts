// math/pack.ts
// Found automatically by artisan (every <folder>/pack.ts next to cli/ is loaded). No registration needed.
import { definePack } from '../cli/index.js';
import { MathCalcCommand } from './MathCalcCommand.js';
import { MathSplitCommand } from './MathSplitCommand.js';
import { MathStatsCommand } from './MathStatsCommand.js';

export default definePack({
  name: 'math',
  description: 'Exact decimal math (Decimal), number helpers (Num), safe expression calculator and math:* commands',
  commands: [MathCalcCommand, MathSplitCommand, MathStatsCommand],
});
