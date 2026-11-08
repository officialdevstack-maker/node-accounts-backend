import { join } from 'node:path';
import { className, Command, displayPath, writeFileSafe } from '../../cli/index.js';
import { providerStub } from '../stubs.js';
export class MakeProviderCommand extends Command {
    signature = 'make:provider {name : e.g. Queue or QueueServiceProvider} {--force : Overwrite if it exists}';
    description = 'Create a service provider in src/providers';
    async handle() {
        const { full } = className(this.argument('name'), 'ServiceProvider');
        const file = join(process.cwd(), 'src', 'providers', `${full}.ts`);
        const result = await writeFileSafe(file, providerStub(full), this.flag('force'));
        if (result === 'exists') {
            this.error(`${displayPath(file)} already exists. Use --force to overwrite.`);
            return 1;
        }
        this.success(`${full} ${result}: ${displayPath(file)}`);
        this.comment(`Add it to the list in src/bootstrap/app.ts: Application.create(..., ${full})`);
        return 0;
    }
}
//# sourceMappingURL=MakeProviderCommand.js.map