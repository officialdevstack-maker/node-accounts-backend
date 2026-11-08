import { dirname, join, relative, sep } from 'node:path';
import { className, CliError, Command, displayPath, toPascal, writeFileSafe } from '../../cli/index.js';
import { requestStub } from '../stubs.js';

export class MakeRequestCommand extends Command {
  readonly signature =
    'make:request {name : e.g. RegisterUser, RegisterUserRequest or Auth/Login} {--force : Overwrite if it exists}';
  readonly description = 'Create a form request in src/requests';

  async handle(): Promise<number> {
    const raw = this.argument('name')!;
    const segments = raw.split(/[\\/]/).filter(Boolean);
    const last = segments.pop();
    const folders = segments.map(toPascal);
    if (!last || folders.some((f) => !f)) throw new CliError(`"${raw}" is not a valid request name.`);

    const { full } = className(last, 'Request');

    const file = join(process.cwd(), 'src', 'requests', ...folders, `${full}.ts`);
    const importPath = relative(dirname(file), join(process.cwd(), 'src', 'lib', 'core', 'request', 'index.js'))
      .split(sep)
      .join('/')
      .replace(/^([^./])/, './$1');

    const result = await writeFileSafe(file, requestStub(full, importPath), this.flag('force'));
    if (result === 'exists') {
      this.error(`${displayPath(file)} already exists. Use --force to overwrite.`);
      return 1;
    }

    this.success(`${full} ${result}: ${displayPath(file)}`);
    this.comment(`Use it: Route.post('/path', [controller, 'store']).request(${full})`);
    return 0;
  }
}
