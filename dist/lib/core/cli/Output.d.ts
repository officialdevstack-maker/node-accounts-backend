import type { Writable } from 'node:stream';
declare const STYLES: {
    readonly bold: readonly [1, 22];
    readonly dim: readonly [2, 22];
    readonly red: readonly [31, 39];
    readonly green: readonly [32, 39];
    readonly yellow: readonly [33, 39];
    readonly cyan: readonly [36, 39];
    readonly gray: readonly [90, 39];
};
export type StyleName = keyof typeof STYLES;
export declare class Output {
    private readonly out;
    private readonly err;
    /** When false, ask()/confirm()/choice() return their defaults instead of prompting. */
    private readonly interactive;
    constructor(out?: Writable, err?: Writable, 
    /** When false, ask()/confirm()/choice() return their defaults instead of prompting. */
    interactive?: boolean);
    private colorEnabled;
    style(name: StyleName, text: string, stream?: Writable): string;
    line(text?: string): void;
    newLine(count?: number): void;
    info(text: string): void;
    success(text: string): void;
    warn(text: string): void;
    comment(text: string): void;
    error(text: string): void;
    title(text: string): void;
    /** table(['Name', 'Value'], [['a', '1'], ['b', '2']]) */
    table(headers: string[], rows: string[][]): void;
    /** label ........ value  (used by `about`) */
    definitionList(rows: Array<[label: string, value: string]>): void;
    ask(question: string, fallback?: string): Promise<string>;
    confirm(question: string, fallback?: boolean): Promise<boolean>;
    choice<T extends string>(question: string, choices: readonly T[], fallback?: T): Promise<T>;
}
export {};
//# sourceMappingURL=Output.d.ts.map