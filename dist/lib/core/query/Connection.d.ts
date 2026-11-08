import type { Pool, PoolConnection } from 'mysql2/promise';
import { QueryBuilder } from './Builder.js';
import { type Grammar } from './grammar/index.js';
import { Raw } from './Raw.js';
import type { ExecResult, QueryEvent, Row } from './types.js';
export declare class Connection {
    private readonly pool;
    private readonly pinned?;
    static readonly listeners: Array<(event: QueryEvent) => void>;
    readonly grammar: Grammar;
    private inTransaction;
    /** `session` is set when this connection is pinned to one physical connection (transactions, SET ...). */
    constructor(pool: Pool, pinned?: PoolConnection | undefined);
    get dialect(): string;
    private get runner();
    table(name: string | Raw): QueryBuilder;
    query(): QueryBuilder;
    raw(sql: string, bindings?: readonly unknown[]): Raw;
    select(sql: string, bindings?: readonly unknown[]): Promise<Row[]>;
    selectOne(sql: string, bindings?: readonly unknown[]): Promise<Row | null>;
    insert(sql: string, bindings?: readonly unknown[]): Promise<boolean>;
    update(sql: string, bindings?: readonly unknown[]): Promise<number>;
    delete(sql: string, bindings?: readonly unknown[]): Promise<number>;
    statement(sql: string, bindings?: readonly unknown[]): Promise<void>;
    execute(sql: string, bindings?: readonly unknown[]): Promise<ExecResult>;
    /** Run `callback` on one physical connection (needed for SET ..., transactions). */
    session<T>(callback: (connection: Connection) => Promise<T>): Promise<T>;
    transaction<T>(callback: (trx: Connection) => Promise<T>): Promise<T>;
    private run;
}
//# sourceMappingURL=Connection.d.ts.map