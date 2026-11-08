// cli/index.ts
// Single import point:  import { Command, Kernel, artisan } from './cli/index.js';
import { builtins } from './builtins.js';
import { Kernel } from './Kernel.js';
import { Output } from './Output.js';
import { appPath, appRoot } from './support.js';
export { Command } from './Command.js';
export { Kernel } from './Kernel.js';
export { definePack } from './Pack.js';
export * from './support.js'; // appPath, writeFileSafe, addExport, className ... for pack generators
export { Output } from './Output.js';
export { CliError } from './Input.js';
/** Boot the CLI and run argv. Called by artisan.ts. */
export async function artisan(argv) {
    const io = new Output();
    let code;
    try {
        // Loads .env and validates config first, so a typo like MAIL_MAILER=smpt gives one clear message.
        await import('../config/index.js');
        // Order matters, later wins: built-ins < packs (<folder>/pack.ts) < your own commands/ folder.
        Kernel.register(...builtins);
        const packs = await Kernel.discoverPacks(appRoot);
        for (const failure of packs.failed)
            io.error(`Pack "${failure.folder}" could not be loaded: ${failure.error}`);
        await Kernel.discover(appPath('commands'));
        code = await Kernel.run(argv, io);
    }
    catch (error) {
        io.error(`Boot failed: ${error instanceof Error ? error.message : String(error)}`);
        code = 1;
    }
    // Pooled SMTP connections can keep the process alive after a command finishes; make sure we exit.
    process.exitCode = code;
    setTimeout(() => process.exit(code), 100).unref();
}
//# sourceMappingURL=index.js.map