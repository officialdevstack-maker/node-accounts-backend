// math/commands/MathSplitCommand.ts
import { CliError, Command } from '../cli/index.js';
import { Decimal } from './Decimal.js';

export class MathSplitCommand extends Command {
  readonly signature =
    'math:split {amount : Amount to split, e.g. 1000} {ratios : Comma separated ratios, e.g. 50,30,20} {--scale=2 : Decimal places}';
  readonly description = 'Split an amount by ratios without losing the smallest unit';

  async handle(): Promise<number> {
    const scale = Number(this.option('scale'));
    if (!Number.isInteger(scale) || scale < 0 || scale > 12) throw new CliError('--scale must be a whole number between 0 and 12.');

    const ratios = this.argument('ratios')!.split(',').map((r) => r.trim()).filter(Boolean);

    try {
      const amount = Decimal.parse(this.argument('amount')!);
      const parts = amount.allocate(ratios, scale);

      this.table(
        ['Part', 'Ratio', 'Amount'],
        parts.map((part, index) => [String(index + 1), ratios[index]!, part.format(scale)]),
      );
      this.newLine();
      this.comment(`Total: ${Decimal.sum(parts).format(scale)}`);
      return 0;
    } catch (error) {
      throw new CliError(error instanceof Error ? error.message : String(error));
    }
  }
}
