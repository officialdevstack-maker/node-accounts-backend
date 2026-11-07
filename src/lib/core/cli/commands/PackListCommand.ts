// cli/commands/PackListCommand.ts
import { Command } from '../Command.js';
import { Kernel } from '../Kernel.js';
import { displayPath } from '../support.js';

export class PackListCommand extends Command {
  readonly signature = 'pack:list';
  readonly description = 'List the packs registered with artisan and the commands they add';

  handle(): void {
    const packs = Kernel.packs();

    if (!packs.length) {
      this.comment('No packs registered. Create one with: artisan make:pack <name>');
      return;
    }

    this.table(
      ['Pack', 'Commands', 'Description', 'Loaded from'],
      packs.map(({ pack, commands, source }) => [
        pack.name,
        String(commands.length),
        pack.description ?? '',
        source ? displayPath(source) : '(code)',
      ]),
    );

    for (const { pack, commands, overrides } of packs) {
      this.title(pack.name);
      for (const name of commands) {
        const note = overrides.includes(name) ? this.io.style('yellow', '  (replaces an existing command)') : '';
        this.line(`  ${this.io.style('green', name)}${note}`);
      }
    }
    this.newLine();
  }
}
