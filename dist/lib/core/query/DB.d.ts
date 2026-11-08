import type { QueryBuilder } from './Builder.js';
import { Connection } from './Connection.js';
import { Raw } from './Raw.js';
import type { QueryEvent, Row } from './types.js';
export declare class DB {
    private static custom?;
    static useConnection(connection: Connection): void;
    static connection(): Connection;
    static table(name: string | Raw): QueryBuilder;
    static query(): QueryBuilder;
    static raw(sql: string, bindings?: readonly unknown[]): Raw;
    static select(sql: string, bindings?: readonly unknown[]): Promise<Row[]>;
    static selectOne(sql: string, bindings?: readonly unknown[]): Promise<Row | null>;
    static insert(sql: string, bindings?: readonly unknown[]): Promise<boolean>;
    static update(sql: string, bindings?: readonly unknown[]): Promise<number>;
    static delete(sql: string, bindings?: readonly unknown[]): Promise<number>;
    static statement(sql: string, bindings?: readonly unknown[]): Promise<void>;
    static transaction<T>(callback: (trx: Connection) => Promise<T>): Promise<T>;
    static listen(listener: (event: QueryEvent) => void): () => void;
}
//# sourceMappingURL=DB.d.ts.map