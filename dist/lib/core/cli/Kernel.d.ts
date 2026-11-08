import { Command } from './Command.js';
import { Output } from './Output.js';
import type { Pack } from './Pack.js';
export type CommandClass = new () => Command;
export interface PackEntry {
    pack: Pack;
    /** File the pack was loaded from (undefined when registered from code). */
    source?: string;
    /** Names of the commands it added. */
    commands: string[];
    /** Commands that already existed and were replaced by this pack. */
    overrides: string[];
}
export interface PackDiscovery {
    loaded: string[];
    failed: Array<{
        folder: string;
        error: string;
    }>;
}
export declare class Kernel {
    private static commands;
    private static packEntries;
    /** Kernel.register(SendReportsCommand, ...). A command registered later replaces one with the same name. */
    static register(...classes: CommandClass[]): void;
    /** Register a pack and every command it declares. Throws on an invalid or duplicate pack. */
    static registerPack(pack: Pack, source?: string): void;
    /**
     * Look one level down from `root` for `<folder>/pack.ts` and register what it exports.
     * A pack that fails to load is reported but never stops the CLI (a broken pack must not lock you out of `migrate`).
     */
    static discoverPacks(root: string): Promise<PackDiscovery>;
    static packs(): PackEntry[];
    /** Import every file in a folder and register the Command classes they export. */
    static discover(dir: string): Promise<number>;
    static all(): Command[];
    static find(name: string): Command | undefined;
    /** Run a command by name from code: await Kernel.call('mail:test', ['a@b.com']) */
    static call(name: string, argv?: string[], io?: Output): Promise<number>;
    /** Entry point used by artisan.ts. Returns the exit code. */
    static run(argv: string[], io?: Output): Promise<number>;
    private static unknown;
    private static report;
}
//# sourceMappingURL=Kernel.d.ts.map