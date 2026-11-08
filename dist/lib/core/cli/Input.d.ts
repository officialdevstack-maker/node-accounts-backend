export declare class CliError extends Error {
    /** Print the command's usage line under the error. */
    readonly showUsage: boolean;
    constructor(message: string, 
    /** Print the command's usage line under the error. */
    showUsage?: boolean);
}
export interface ArgumentDef {
    name: string;
    description: string;
    required: boolean;
    default?: string;
}
export interface OptionDef {
    name: string;
    shortcut?: string;
    description: string;
    takesValue: boolean;
    default?: string;
}
export interface SignatureDef {
    name: string;
    arguments: ArgumentDef[];
    options: OptionDef[];
}
export interface ParsedInput {
    arguments: Record<string, string | undefined>;
    options: Record<string, string | boolean | undefined>;
}
export declare function parseSignature(signature: string): SignatureDef;
export declare function parseArgv(def: SignatureDef, argv: string[]): ParsedInput;
//# sourceMappingURL=Input.d.ts.map