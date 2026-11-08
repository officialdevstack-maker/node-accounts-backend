import type { JoinClause, QueryBuilder } from '../Builder.js';
import type { Column, Compiled, CompileState, DatePart, HavingClause, LockMode, OrderClause, Row, Source, WhereClause } from '../types.js';
export declare abstract class Grammar {
    abstract readonly dialect: string;
    protected abstract readonly quote: string;
    protected readonly limitedWrites: boolean;
    wrap(value: string): string;
    protected segment(name: string): string;
    protected column(value: Column, s: CompileState): string;
    protected source(source: Source, s: CompileState): string;
    protected param(value: unknown, s: CompileState): string;
    protected params(values: readonly unknown[], s: CompileState): string;
    protected operator(op: string): string;
    protected abstract dateExpr(part: DatePart, column: string): string;
    protected abstract random(): string;
    protected lock(_mode: LockMode): string;
    protected insertVerb(_ignore: boolean): string;
    protected ignoreSuffix(): string;
    protected returning(_column: string): string;
    protected emptyInsert(): string;
    protected limitOffset(limit: number | undefined, offset: number | undefined): string[];
    abstract truncate(table: string): Compiled[];
    compileSelect(query: QueryBuilder): Compiled;
    compileExists(query: QueryBuilder): Compiled;
    protected select(q: QueryBuilder, s: CompileState): string;
    protected columns(q: QueryBuilder, s: CompileState): string;
    protected join(join: JoinClause, s: CompileState): string;
    protected orderLimit(q: QueryBuilder, s: CompileState): string[];
    protected order(order: OrderClause, s: CompileState): string;
    protected whereBody(wheres: readonly WhereClause[], s: CompileState): string;
    protected where(w: WhereClause, s: CompileState): string;
    protected havingBody(havings: readonly HavingClause[], s: CompileState): string;
    insert(table: string, rows: Row[], options?: {
        ignore?: boolean;
        returning?: string;
    }): Compiled;
    upsert(table: string, rows: Row[], uniqueBy: string[], update: string[]): Compiled;
    update(q: QueryBuilder, values: Row): Compiled;
    delete(q: QueryBuilder): Compiled;
    private writeTable;
    private writeTail;
}
//# sourceMappingURL=Grammar.d.ts.map