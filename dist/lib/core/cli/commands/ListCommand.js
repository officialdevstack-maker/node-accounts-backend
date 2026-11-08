// cli/commands/ListCommand.ts
import { Command } from '../Command.js';
import { Kernel } from '../Kernel.js';
export class ListCommand extends Command {
    signature = 'list';
    description = 'List all available commands';
    handle() {
        const commands = Kernel.all().filter((c) => !c.hidden);
        const width = Math.max(...commands.map((c) => c.name.length)) + 2;
        this.line();
        this.line(this.io.style('bold', 'Artisan CLI'));
        this.line();
        this.line('Usage:  command [arguments] [options]');
        this.line(this.io.style('gray', "        help <command>   show a command's arguments and options"));
        const print = (list) => {
            for (const command of list) {
                this.line(`  ${this.io.style('green', command.name.padEnd(width))}${command.description}`);
            }
        };
        // Commands without a namespace first, then one block per namespace.
        this.title('Available commands');
        print(commands.filter((c) => !c.name.includes(':')));
        const namespaces = [...new Set(commands.filter((c) => c.name.includes(':')).map((c) => c.name.split(':')[0]))];
        for (const namespace of namespaces) {
            this.title(namespace);
            print(commands.filter((c) => c.name.startsWith(`${namespace}:`)));
        }
        this.line();
    }
}
//# sourceMappingURL=ListCommand.js.map