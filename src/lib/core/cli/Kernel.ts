// cli/Kernel.ts
// Registers commands, resolves argv to a command, and reports errors (like Laravel's Console Kernel).
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Command } from './Command.js';
import { CliError } from './Input.js';
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
  failed: Array<{ folder: string; error: string }>;
}

/** Folders that never contain packs. */
const IGNORED_FOLDERS = new Set(['node_modules', 'dist', 'build', 'coverage', 'cli', 'commands']);
const PACK_FILES = ['pack.ts', 'pack.js', 'pack.mjs'];

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j]!, row[j - 1]!);
      prev = tmp;
    }
  }
  return row[b.length]!;
}

export class Kernel {
  private static commands = new Map<string, Command>();
  private static packEntries = new Map<string, PackEntry>();

  /** Kernel.register(SendReportsCommand, ...). A command registered later replaces one with the same name. */
  static register(...classes: CommandClass[]): void {
    for (const Class of classes) {
      const command = new Class();
      this.commands.set(command.name, command);
    }
  }

  /** Register a pack and every command it declares. Throws on an invalid or duplicate pack. */
  static registerPack(pack: Pack, source?: string): void {
    const where = source ? ` (${source})` : '';

    if (!pack || typeof pack.name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(pack.name)) {
      throw new CliError(`Invalid pack${where}: "name" must be lowercase letters, numbers and "-".`);
    }
    if (this.packEntries.has(pack.name)) {
      throw new CliError(`Pack "${pack.name}" is already registered${where}.`);
    }

    // Instantiate first so a broken command class doesn't leave the pack half registered.
    const instances = (pack.commands ?? []).map((Class) => new Class());
    const overrides = instances.map((c) => c.name).filter((name) => this.commands.has(name));
    for (const command of instances) this.commands.set(command.name, command);

    this.packEntries.set(pack.name, {
      pack,
      source,
      commands: instances.map((c) => c.name).sort(),
      overrides,
    });
  }

  /**
   * Look one level down from `root` for `<folder>/pack.ts` and register what it exports.
   * A pack that fails to load is reported but never stops the CLI (a broken pack must not lock you out of `migrate`).
   */
  static async discoverPacks(root: string): Promise<PackDiscovery> {
    const report: PackDiscovery = { loaded: [], failed: [] };

    let folders;
    try {
      folders = await readdir(root, { withFileTypes: true });
    } catch {
      return report;
    }

    for (const folder of folders.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!folder.isDirectory() || folder.name.startsWith('.') || IGNORED_FOLDERS.has(folder.name)) continue;

      const file = PACK_FILES.map((f) => join(root, folder.name, f)).find((f) => existsSync(f));
      if (!file) continue;

      try {
        const module = (await import(pathToFileURL(file).href)) as { default?: Pack; pack?: Pack };
        const pack = module.default ?? module.pack;
        if (!pack) throw new Error(`${folder.name}/pack must export a pack: export default definePack({ ... })`);

        this.registerPack(pack, file);
        report.loaded.push(pack.name);
      } catch (error) {
        report.failed.push({ folder: folder.name, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return report;
  }

  static packs(): PackEntry[] {
    return [...this.packEntries.values()].sort((a, b) => a.pack.name.localeCompare(b.pack.name));
  }

  /** Import every file in a folder and register the Command classes they export. */
  static async discover(dir: string): Promise<number> {
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      return 0; // folder doesn't exist yet, that's fine
    }

    let count = 0;
    for (const file of files.sort()) {
      if (!/\.(ts|js|mjs)$/.test(file) || file.endsWith('.d.ts')) continue;

      const module = (await import(pathToFileURL(join(dir, file)).href)) as Record<string, unknown>;
      for (const exported of Object.values(module)) {
        if (typeof exported === 'function' && exported.prototype instanceof Command) {
          this.register(exported as CommandClass);
          count++;
        }
      }
    }
    return count;
  }

  static all(): Command[] {
    return [...this.commands.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  static find(name: string): Command | undefined {
    return this.commands.get(name);
  }

  /** Run a command by name from code: await Kernel.call('mail:test', ['a@b.com']) */
  static async call(name: string, argv: string[] = [], io: Output = new Output()): Promise<number> {
    const command = this.find(name);
    if (!command) throw new CliError(`Command "${name}" is not defined.`);
    return command.run(argv, io);
  }

  /** Entry point used by artisan.ts. Returns the exit code. */
  static async run(argv: string[], io: Output = new Output()): Promise<number> {
    const [first, ...rest] = argv;
    let command: Command | undefined;

    try {
      if (first === undefined || first === '--help' || first === '-h') return await this.call('list', [], io);

      if (first === 'help') {
        if (!rest[0]) return await this.call('list', [], io);
        const target = this.find(rest[0]);
        if (!target) return this.unknown(rest[0], io);
        target.renderHelp(io);
        return 0;
      }

      command = this.find(first);
      if (!command) return this.unknown(first, io);

      if (rest.includes('--help') || rest.includes('-h')) {
        command.renderHelp(io);
        return 0;
      }

      return await command.run(rest, io);
    } catch (error) {
      return this.report(error, io, command);
    }
  }

  private static unknown(name: string, io: Output): number {
    io.error(`Command "${name}" is not defined.`);

    const matches = this.all()
      .map((c) => c.name)
      .filter((n) => n.startsWith(name) || n.includes(name) || distance(n, name) <= 3)
      .slice(0, 5);

    if (matches.length) {
      io.newLine();
      io.line('Did you mean one of these?');
      for (const m of matches) io.line(`  ${io.style('green', m)}`);
    }
    return 1;
  }

  private static report(error: unknown, io: Output, command?: Command): number {
    if (error instanceof CliError) {
      io.error(error.message);
      if (error.showUsage && command) {
        io.newLine();
        io.line(`Usage: ${command.usage()}   (see: help ${command.name})`);
      }
      return 1;
    }

    const message = error instanceof Error ? error.message : String(error);
    io.error(`Error: ${message}`);

    const debug = ['1', 'true', 'yes', 'on'].includes((process.env.APP_DEBUG ?? '').toLowerCase());
    if (debug && error instanceof Error && error.stack) io.comment(error.stack);

    return 1;
  }
}
