import type { Compiled, DatePart, LockMode, Row } from '../types.js';
import { Grammar } from './Grammar.js';
export declare class MySqlGrammar extends Grammar {
    readonly dialect = "mysql";
    protected readonly quote = "`";
    protected readonly limitedWrites: boolean;
    protected dateExpr(part: DatePart, column: string): string;
    protected random(): string;
    protected lock(mode: LockMode): string;
    protected insertVerb(ignore: boolean): string;
    protected emptyInsert(): string;
    protected limitOffset(limit: number | undefined, offset: number | undefined): string[];
    upsert(table: string, rows: Row[], _uniqueBy: string[], update: string[]): Compiled;
    truncate(table: string): Compiled[];
}
//# sourceMappingURL=MySqlGrammar.d.ts.map