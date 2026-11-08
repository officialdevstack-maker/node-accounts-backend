export type MigrationKind = 'create' | 'alter' | 'blank';
export declare function migrationStub(file: string, kind: MigrationKind, table?: string): string;
export declare function seederStub(cls: string): string;
//# sourceMappingURL=stubs.d.ts.map