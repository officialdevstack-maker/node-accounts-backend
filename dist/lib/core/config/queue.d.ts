export declare const queueConfig: {
    driver: "memory" | "redis";
    tries: number;
    backoffMs: number;
    redis: {
        host: string;
        port: number;
        password: string | undefined;
    };
};
//# sourceMappingURL=queue.d.ts.map