export declare const Rule: {
    in: (values: Array<string | number>) => string;
    notIn: (values: Array<string | number>) => string;
    unique: (table: string, column?: string, options?: {
        ignore?: string | number;
        idColumn?: string;
    }) => string;
    exists: (table: string, column?: string) => string;
};
export default Rule;
//# sourceMappingURL=Rule.d.ts.map