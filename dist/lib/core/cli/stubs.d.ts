export declare function mailableStub(cls: string, title: string): string;
export interface NotificationStubOptions {
    cls: string;
    title: string;
    channels: string[];
    mailable?: string | undefined;
}
export declare function notificationStub({ cls, title, channels, mailable }: NotificationStubOptions): string;
export declare function commandStub(cls: string, signatureName: string): string;
export interface PackStubOptions {
    /** kebab-case folder name, e.g. billing */
    name: string;
    /** PascalCase, e.g. Billing */
    pascal: string;
    description: string;
}
export declare function packStub({ name, pascal, description }: PackStubOptions): string;
export declare function packCommandStub({ name, pascal }: PackStubOptions): string;
export declare function packIndexStub({ name }: PackStubOptions): string;
export declare function packReadmeStub({ name, description }: PackStubOptions): string;
//# sourceMappingURL=stubs.d.ts.map