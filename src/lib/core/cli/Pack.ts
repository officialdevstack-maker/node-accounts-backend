// cli/Pack.ts
// A "pack" is a folder (mail/, database/, billing/ ...) that can plug its own commands into artisan.
// Drop a `pack.ts` in the folder and the CLI finds it, no registration step:
//
//   // billing/pack.ts
//   import { definePack } from '../cli/index.js';
//   import { InvoiceSendCommand } from './commands/InvoiceSendCommand.js';
//
//   export default definePack({ name: 'billing', description: 'Invoices', commands: [InvoiceSendCommand] });
import type { CommandClass } from './Kernel.js';

export interface Pack {
  /** Lowercase letters, numbers and "-". Must be unique. */
  name: string;
  description?: string;
  /** Command classes this pack adds to artisan. */
  commands?: CommandClass[];
}

/** Identity helper that gives you type checking and autocomplete in pack.ts. */
export function definePack(pack: Pack): Pack {
  return pack;
}
