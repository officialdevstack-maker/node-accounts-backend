import { type SignatureDef } from './Input.js';
import { Output } from './Output.js';
export declare abstract class Command {
    /** 'namespace:name {argument} {argument?} {--flag} {--option=default}'  (see cli/Input.ts) */
    abstract readonly signature: string;
    abstract readonly description: string;
    /** Hide from `list` (still runnable). */
    readonly hidden: boolean;
    /** Do the work. Return a number to set the exit code (default 0). */
    abstract handle(): Promise<number | void> | number | void;
    protected io: Output;
    private input;
    private parsed?;
    get definition(): SignatureDef;
    get name(): string;
    usage(): string;
    renderHelp(io: Output): void;
    run(argv: string[], io: Output): Promise<number>;
    protected argument(name: string): string | undefined;
    /** Value of a `--option=value`. */
    protected option(name: string): string | undefined;
    /** True when a `--flag` was passed. */
    protected flag(name: string): boolean;
    protected line(text?: string): void;
    protected newLine(count?: number): void;
    protected info(text: string): void;
    protected success(text: string): void;
    protected warn(text: string): void;
    protected comment(text: string): void;
    protected error(text: string): void;
    protected title(text: string): void;
    protected table(headers: string[], rows: string[][]): void;
    protected ask(question: string, fallback?: string): Promise<string>;
    protected confirm(question: string, fallback?: boolean): Promise<boolean>;
    protected choice<T extends string>(question: string, choices: readonly T[], fallback?: T): Promise<T>;
}
//# sourceMappingURL=Command.d.ts.map