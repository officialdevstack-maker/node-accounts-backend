import { Command } from '../../cli/index.js';
export declare class MakeControllerCommand extends Command {
    readonly signature = "make:controller {name : e.g. Wallet or WalletController} {--r|resource : Add index, store, show, update and destroy methods} {--force : Overwrite if it exists}";
    readonly description = "Create a controller in src/controllers";
    handle(): Promise<number>;
}
//# sourceMappingURL=MakeControllerCommand.d.ts.map