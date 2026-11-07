// cli/Output.ts
// Terminal output + prompts. Zero dependencies. Colours switch off automatically
// when piped, or when NO_COLOR is set (FORCE_COLOR=1 forces them on).
import { createInterface } from 'node:readline/promises';
import type { Writable } from 'node:stream';

const STYLES = {
  bold: [1, 22],
  dim: [2, 22],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  cyan: [36, 39],
  gray: [90, 39],
} as const;

export type StyleName = keyof typeof STYLES;

export class Output {
  constructor(
    private readonly out: Writable = process.stdout,
    private readonly err: Writable = process.stderr,
    /** When false, ask()/confirm()/choice() return their defaults instead of prompting. */
    private readonly interactive: boolean = Boolean(process.stdin.isTTY),
  ) {}

  // ---- styling ---------------------------------------------------------------------------
  private colorEnabled(stream: Writable): boolean {
    if ('NO_COLOR' in process.env) return false;
    if (process.env.FORCE_COLOR) return true;
    return Boolean((stream as NodeJS.WriteStream).isTTY);
  }

  style(name: StyleName, text: string, stream: Writable = this.out): string {
    if (!this.colorEnabled(stream)) return text;
    const [open, close] = STYLES[name];
    return `\x1b[${open}m${text}\x1b[${close}m`;
  }

  // ---- writing ---------------------------------------------------------------------------
  line(text = ''): void {
    this.out.write(`${text}\n`);
  }

  newLine(count = 1): void {
    this.out.write('\n'.repeat(count));
  }

  info(text: string): void {
    this.line(this.style('green', text));
  }

  success(text: string): void {
    this.line(`${this.style('green', ' DONE ')} ${text}`);
  }

  warn(text: string): void {
    this.line(this.style('yellow', text));
  }

  comment(text: string): void {
    this.line(this.style('gray', text));
  }

  error(text: string): void {
    this.err.write(`${this.style('red', text, this.err)}\n`);
  }

  title(text: string): void {
    this.newLine();
    this.line(this.style('bold', text));
  }

  /** table(['Name', 'Value'], [['a', '1'], ['b', '2']]) */
  table(headers: string[], rows: string[][]): void {
    const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
    const fmt = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i] ?? 0)).join('  ');

    this.line(this.style('bold', fmt(headers)));
    this.line(this.style('gray', widths.map((w) => '-'.repeat(w)).join('  ')));
    for (const row of rows) this.line(fmt(row));
  }

  /** label ........ value  (used by `about`) */
  definitionList(rows: Array<[label: string, value: string]>): void {
    const width = Math.max(...rows.map(([label]) => label.length)) + 3;
    for (const [label, value] of rows) {
      const dots = this.style('gray', '.'.repeat(width - label.length));
      this.line(`  ${this.style('bold', label)} ${dots} ${value}`);
    }
  }

  // ---- prompts ---------------------------------------------------------------------------
  async ask(question: string, fallback = ''): Promise<string> {
    if (!this.interactive) return fallback;

    const rl = createInterface({ input: process.stdin, output: this.out as NodeJS.WritableStream });
    try {
      const hint = fallback ? this.style('gray', ` [${fallback}]`) : '';
      const answer = (await rl.question(`${question}${hint} `)).trim();
      return answer || fallback;
    } finally {
      rl.close();
    }
  }

  async confirm(question: string, fallback = false): Promise<boolean> {
    if (!this.interactive) return fallback;
    const answer = await this.ask(`${question} (yes/no)`, fallback ? 'yes' : 'no');
    return /^y(es)?$/i.test(answer);
  }

  async choice<T extends string>(question: string, choices: readonly T[], fallback?: T): Promise<T> {
    const initial = fallback ?? choices[0]!;
    if (!this.interactive) return initial;

    for (;;) {
      const answer = await this.ask(`${question} (${choices.join('/')})`, initial);
      if ((choices as readonly string[]).includes(answer)) return answer as T;
      this.error(`"${answer}" is not one of: ${choices.join(', ')}`);
    }
  }
}
