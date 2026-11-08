import type { CommandClass } from './Kernel.js';
export interface Pack {
    /** Lowercase letters, numbers and "-". Must be unique. */
    name: string;
    description?: string;
    /** Command classes this pack adds to artisan. */
    commands?: CommandClass[];
}
/** Identity helper that gives you type checking and autocomplete in pack.ts. */
export declare function definePack(pack: Pack): Pack;
//# sourceMappingURL=Pack.d.ts.map