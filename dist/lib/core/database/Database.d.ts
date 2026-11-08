import { Connection } from '../query/Connection.js';
export declare class Database {
    private static pool;
    private static conn;
    private static logging;
    /** The shared connection. Created lazily, nothing connects until the first query. */
    static connection(): Connection;
    /** Throws if the database can't be reached or the credentials are wrong. */
    static authenticate(): Promise<void>;
    static close(): Promise<void>;
}
//# sourceMappingURL=Database.d.ts.map