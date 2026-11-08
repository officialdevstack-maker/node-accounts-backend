export interface ControllerStubOptions {
    cls: string;
    instance: string;
    /** Import path to controller/index.js, relative to the new file. */
    importPath: string;
    resource: boolean;
}
export declare function controllerStub({ cls, instance, importPath, resource }: ControllerStubOptions): string;
//# sourceMappingURL=stubs.d.ts.map