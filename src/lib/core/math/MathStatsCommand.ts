// math/commands/MathStatsCommand.ts
import { CliError, Command } from '../../cli/index.js';
import { Num } from '../Num.js';

export class MathStatsCommand extends Command {
  readonly signature = 'math:stats {numbers : Comma separated numbers, e.g. 4,8,15,16,23,42} {--sample : Use the sample (n - 1) standard deviation}';
  readonly description = 'Count, sum, average, median, min, max and standard deviation of a list';

  async handle(): Promise<number> {
    const values = this.argument('numbers')!
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .map(Number);

    if (!values.length || values.some((v) => !Number.isFinite(v))) throw new CliError('Give a comma separated list of numbers.');

    const sample = this.flag('sample');
    if (sample && values.length < 2) throw new CliError('--sample needs at least two numbers.');

    this.table(
      ['Stat', 'Value'],
      [
        ['Count', String(values.length)],
        ['Sum', String(Num.sum(values))],
        ['Average', String(Num.avg(values))],
        ['Median', String(Num.median(values))],
        ['Mode', Num.mode(values).join(', ')],
        ['Min', String(Num.min(values))],
        ['Max', String(Num.max(values))],
        [sample ? 'Std dev (sample)' : 'Std dev', String(Num.round(Num.stdDev(values, sample), 6))],
      ],
    );
    return 0;
  }
}
