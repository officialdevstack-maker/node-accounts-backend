// cli/Command.ts
// Base class for every artisan command, like Illuminate\Console\Command.
import { parseArgv, parseSignature, type ParsedInput, type SignatureDef } from './Input.js';
import { Output } from './Output.js';

export abstract class Command {
  /** 'namespace:name {argument} {argument?} {--flag} {--option=default}'  (see cli/Input.ts) */
  abstract readonly signature: string;
  abstract readonly description: string;

  /** Hide from `list` (still runnable). */
  readonly hidden: boolean = false;

  /** Do the work. Return a number to set the exit code (default 0). */
  abstract handle(): Promise<number | void> | number | void;

  protected io!: Output;
  private input!: ParsedInput;
  private parsed?: SignatureDef;

  // ---- definition ------------------------------------------------------------------------
  get definition(): SignatureDef {
    return (this.parsed ??= parseSignature(this.signature));
  }

  get name(): string {
    return this.definition.name;
  }

  usage(): string {
    const args = this.definition.arguments.map((a) => (a.required ? `<${a.name}>` : `[<${a.name}>]`));
    const opts = this.definition.options.length ? ['[options]'] : [];
    return [this.name, ...args, ...opts].join(' ');
  }

  renderHelp(io: Output): void {
    const { arguments: args, options } = this.definition;

    io.title('Description:');
    io.line(`  ${this.description}`);
    io.title('Usage:');
    io.line(`  ${this.usage()}`);

    if (args.length) {
      io.title('Arguments:');
      const width = Math.max(...args.map((a) => a.name.length));
      for (const a of args) {
        const extra = a.default ? io.style('gray', ` [default: ${a.default}]`) : a.required ? '' : io.style('gray', ' (optional)');
        io.line(`  ${io.style('green', a.name.padEnd(width))}  ${a.description}${extra}`);
      }
    }

    if (options.length) {
      io.title('Options:');
      const label = (o: SignatureDef['options'][number]) =>
        `${o.shortcut ? `-${o.shortcut}, ` : '    '}--${o.name}${o.takesValue ? '=VALUE' : ''}`;
      const width = Math.max(...options.map((o) => label(o).length));
      for (const o of options) {
        const extra = o.default ? io.style('gray', ` [default: ${o.default}]`) : '';
        io.line(`  ${io.style('green', label(o).padEnd(width))}  ${o.description}${extra}`);
      }
    }
    io.newLine();
  }

  // ---- running ---------------------------------------------------------------------------
  async run(argv: string[], io: Output): Promise<number> {
    this.io = io;
    this.input = parseArgv(this.definition, argv);
    const code = await this.handle();
    return typeof code === 'number' ? code : 0;
  }

  // ---- input helpers ---------------------------------------------------------------------
  protected argument(name: string): string | undefined {
    return this.input.arguments[name];
  }

  /** Value of a `--option=value`. */
  protected option(name: string): string | undefined {
    const value = this.input.options[name];
    return typeof value === 'string' ? value : undefined;
  }

  /** True when a `--flag` was passed. */
  protected flag(name: string): boolean {
    return this.input.options[name] === true;
  }

  // ---- output helpers (delegates to this.io) ---------------------------------------------
  protected line(text = ''): void { this.io.line(text); }
  protected newLine(count = 1): void { this.io.newLine(count); }
  protected info(text: string): void { this.io.info(text); }
  protected success(text: string): void { this.io.success(text); }
  protected warn(text: string): void { this.io.warn(text); }
  protected comment(text: string): void { this.io.comment(text); }
  protected error(text: string): void { this.io.error(text); }
  protected title(text: string): void { this.io.title(text); }
  protected table(headers: string[], rows: string[][]): void { this.io.table(headers, rows); }
  protected ask(question: string, fallback = ''): Promise<string> { return this.io.ask(question, fallback); }
  protected confirm(question: string, fallback = false): Promise<boolean> { return this.io.confirm(question, fallback); }
  protected choice<T extends string>(question: string, choices: readonly T[], fallback?: T): Promise<T> {
    return this.io.choice(question, choices, fallback);
  }
}
