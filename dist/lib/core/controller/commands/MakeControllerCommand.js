import { dirname, join, relative, sep } from 'node:path';
import { appPath, className, CliError, Command, displayPath, toPascal, writeFileSafe } from '../../cli/index.js';
import { controllerStub } from '../stubs.js';
export class MakeControllerCommand extends Command {
    signature = 'make:controller {name : e.g. Wallet, WalletController or Admin/Wallet} {--r|resource : Add index, store, show, update and destroy methods} {--force : Overwrite if it exists}';
    description = 'Create a controller in src/controllers';
    async handle() {
        const raw = this.argument('name');
        const segments = raw.split(/[\\/]/).filter(Boolean);
        const last = segments.pop();
        const folders = segments.map(toPascal);
        if (!last || folders.some((f) => !f))
            throw new CliError(`"${raw}" is not a valid controller name.`);
        const { full, stem } = className(last, 'Controller');
        const base = `${folders.join('')}${stem}`;
        const instance = `${base.charAt(0).toLowerCase()}${base.slice(1)}Controller`;
        const file = join(process.cwd(), 'src', 'controllers', ...folders, `${full}.ts`);
        const importPath = relative(dirname(file), join(process.cwd(), 'src', 'lib', 'core', 'controller', 'index.js'))
            .split(sep)
            .join('/')
            .replace(/^([^./])/, './$1');
        const result = await writeFileSafe(file, controllerStub({ cls: full, instance, importPath, resource: this.flag('resource') }), this.flag('force'));
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