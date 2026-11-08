import { Command } from '../Command.js';
export declare class KeyGenerateCommand extends Command {
    readonly signature = "key:generate {--key=JWT_SECRET : Env variable to set} {--length=48 : Random bytes} {--write : Save into .env instead of printing} {--force : Overwrite without asking}";
    readonly description = "Generate a random secret (e.g. JWT_SECRET)";
    handle(): Promise<number>;
}
//# sourceMappingURL=KeyGenerateCommand.d.ts.map