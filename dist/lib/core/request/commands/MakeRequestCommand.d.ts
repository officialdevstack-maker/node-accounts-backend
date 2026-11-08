import { Command } from '../../cli/index.js';
export declare class MakeRequestCommand extends Command {
    readonly signature = "make:request {name : e.g. RegisterUser, RegisterUserRequest or Auth/Login} {--force : Overwrite if it exists}";
    readonly description = "Create a form request in src/requests";
    handle(): Promise<number>;
}
//# sourceMappingURL=MakeRequestCommand.d.ts.map