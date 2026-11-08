// math/commands/MathCalcCommand.ts
import { CliError, Command } from '../cli/index.js';
import { evaluate } from './Expression.js';

export class MathCalcCommand extends Command {
  readonly signature =
    'math:calc {expression : Quoted expression, e.g. "(1200 * 1.075) / 3"} {--scale=20 : Decimal places kept by division} {--round= : Round the result to this many places}';
  readonly description = 'Evaluate an expression with exact decimal arithmetic';

  async handle(): Promise<number> {
    const scale = Number(this.option('scale'));
    if (!Number.isInteger(scale) || scale < 0 || scale > 100) throw new CliError('--scale must be a whole number between 0 and 100.');

    let result;
    try {
      result = evaluate(this.argument('expression')!, { scale });
    } catch (error) {
      throw new CliError(error instanceof Error ? error.message : String(error));
    }

    const places = this.option('round');
    if (places !== undefined) {
      const n = Number(places);
      if (!Number.isInteger(n) || n < 0 || n > 100) throw new CliError('--round must be a whole number between 0 and 100.');
      result = result.round(n);
    }

    this.line(result.toString());
    return 0;
  }
}
