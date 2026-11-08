export declare const databaseConfig: {
    default: "mysql";
    host: string;
    port: number;
    name: string;
    username: string;
    password: string;
    /** Table that records which migrations have run (Laravel's `migrations` table) */
    migrationsTable: string;
    logging: boolean;
    timezone: string;
    pool: {
        max: number;
        min: number;
        idleMs: number;
        acquireMs: number;
    };
};
//# sourceMappingURL=database.d.ts.map