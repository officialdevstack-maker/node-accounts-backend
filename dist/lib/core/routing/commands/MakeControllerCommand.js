import { join } from 'node:path';
import { Command, className, displayPath, writeFileSafe } from '../../cli/index.js';
import { controllerStub } from '../stubs.js';
export class MakeControllerCommand extends Command {
    signature = 'make:controller {name : e.g. Wallet or WalletController} {--r|resource : Add index, store, show, update and destroy methods} {--force : Overwrite if it exists}';
    description = 'Create a controller in src/controllers';
    async handle() {
        const { full, stem } = className(this.argument('name'), 'Controller');
        const instance = `${stem.charAt(0).toLowerCase()}${stem.slice(1)}Controller`;
        // Controllers live in the app (src/controllers), not inside src/lib/core, so resolve from the project root.
        const file = join(process.cwd(), 'src', 'controllers', `${full}.ts`);
        const result = await writeFileSafe(file, controllerStub(full, instance, this.flag('resource')), this.flag('force'));
        if (result === 'exists') {
            this.error(`${displayPath(file)} already exists. Use --force to overwrite.`);
            return 1;
        }
        this.success(`${full} ${result}: ${displayPath(file)}`);
        this.comment(`Use it: Route.get('/path', [${instance}, 'index'])`);
        return 0;
    }
}
//# sourceMappingURL=MakeControllerCommand.js.map