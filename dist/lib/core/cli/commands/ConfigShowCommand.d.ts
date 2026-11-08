import { Command } from '../Command.js';
export declare class ConfigShowCommand extends Command {
    readonly signature = "config:show {key? : Dot path, e.g. mail.from.address} {--reveal : Show secrets instead of masking them}";
    readonly description = "Display configuration values (secrets are masked)";
    handle(): Promise<number>;
}
//# sourceMappingURL=ConfigShowCommand.d.ts.map