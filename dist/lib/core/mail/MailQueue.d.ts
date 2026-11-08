type Job = () => Promise<unknown>;
export declare class MailQueue {
    static push(job: Job, delayMs?: number): void;
    private static run;
}
export {};
//# sourceMappingURL=MailQueue.d.ts.map