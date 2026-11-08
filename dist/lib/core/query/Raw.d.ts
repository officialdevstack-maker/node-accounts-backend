/** SQL inserted as is. Build it with DB.raw('count(*) as total') and use ? for values: DB.raw('price * ?', [1.5]) */
export declare class Raw {
    readonly value: string;
    readonly bindings: readonly unknown[];
    constructor(value: string, bindings?: readonly unknown[]);
    toString(): string;
}
//# sourceMappingURL=Raw.d.ts.map