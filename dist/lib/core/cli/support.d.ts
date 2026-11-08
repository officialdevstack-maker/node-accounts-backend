/** The folder that holds cli/, mail/, config/, ... (the parent of cli/). Generators write relative to it. */
export declare const appRoot: string;
export declare const appPath: (...parts: string[]) => string;
/** Path shown to the user, relative to where they ran the command. */
export declare const displayPath: (absolute: string) => string;
/** 'wallet_credited' | 'wallet-credited' | 'wallet credited' | 'WalletCredited' -> 'WalletCredited' */
export declare function toPascal(input: string): string;
/** 'SendReports' -> 'send-reports' */
export declare const toKebab: (input: string) => string;
/** 'WalletCredited' -> 'Wallet credited' */
export declare const humanize: (input: string) => string;
/** Turn user input into a class name that always ends with `suffix`: ('welcome', 'Mail') -> 'WelcomeMail'. */
export declare function className(input: string, suffix: string): {
    full: string;
    stem: string;
};
export type WriteResult = 'created' | 'overwritten' | 'exists';
export declare function writeFileSafe(path: string, content: string, force?: boolean): Promise<WriteResult>;
/** Append `line` to an index.ts barrel if the file exists and doesn't already contain it. */
export declare function addExport(indexFile: string, line: string): Promise<boolean>;
//# sourceMappingURL=support.d.ts.map