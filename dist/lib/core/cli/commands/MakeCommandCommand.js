// cli/commands/MakeCommandCommand.ts
import { Command } from '../Command.js';
import { CliError } from '../Input.js';
import { commandStub } from '../stubs.js';
import { appPath, className, displayPath, toKebab, writeFileSafe } from '../support.js';
export class MakeCommandCommand extends Command {
    signature = 'make:command {name : Class name, e.g. SendReports} {--command= : Command name (default app:<kebab-name>)} {--force : Overwrite if it exists}';
    description = 'Create a new artisan command in commands/';
    async handle() {
        const { full, stem } = className(this.argument('name'), 'Command');
        const commandName = this.option('command') ?? `app:${toKebab(stem)}`;
        if (!/^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*)*$/.test(commandName)) {
            throw new CliError(`"${commandName}" is not a valid command name (use lowercase letters, numbers, "-" and ":").`);
        }
        const file = appPath('commands', `${full}.ts`);
        const result = await writeFileSafe(file, commandStub(full, commandName), this.flag('force'));
        if (result === 'exists') {
            this.error(`${displayPath(file)} already exists. Use --force to overwrite.`);
            return 1;
        }
        this.success(`${full} ${result}: ${displayPath(file)}`);
        this.comment(`Run it with: artisan ${commandName}`);
        return 0;
    }
}
//# sourceMappingURL=MakeCommandCommand.js.map