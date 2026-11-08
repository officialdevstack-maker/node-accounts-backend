export declare class MessageBag {
    private bag;
    add(key: string, message: string): this;
    has(key: string): boolean;
    get(key: string): string[];
    first(key?: string): string | null;
    all(): string[];
    keys(): string[];
    count(): number;
    isEmpty(): boolean;
    any(): boolean;
    toObject(): Record<string, string[]>;
    toJSON(): Record<string, string[]>;
}
//# sourceMappingURL=MessageBag.d.ts.map