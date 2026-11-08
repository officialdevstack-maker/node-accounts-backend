export { Command } from './Command.js';
export { Kernel, type CommandClass, type PackEntry, type PackDiscovery } from './Kernel.js';
export { definePack, type Pack } from './Pack.js';
export * from './support.js';
export { Output } from './Output.js';
export { CliError, type ParsedInput, type SignatureDef } from './Input.js';
/** Boot the CLI and run argv. Called by artisan.ts. */
export declare function artisan(argv: string[]): Promise<void>;
//# sourceMappingURL=index.d.ts.map