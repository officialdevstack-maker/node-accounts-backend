import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CliError, Command } from '../../cli/index.js';
import { describeAction, Route } from '../Route.js';
import { normalize } from '../RouteRegistry.js';

export class RouteListCommand extends Command {
  readonly signature =
    'route:list {--file=src/routes/index.ts : Routes file to load (relative to the project root)} {--prefix=/api : Path the router is mounted on} {--method= : Only this HTTP method} {--name= : Only names containing this text} {--path= : Only URIs containing this text}';
  readonly description = 'List every route declared with the Route facade';

  async handle(): Promise<number> {
    const file = join(process.cwd(), this.option('file')!);
    if (!existsSync(file)) throw new CliError(`Routes file not found: ${this.option('file')}`);

    await import(pathToFileURL(file).href); // declaring the routes fills the registry

    const prefix = this.option('prefix') ?? '';
    const method = this.option('method')?.toUpperCase();
    const name = this.option('name');
    const path = this.option('path');

    const rows = Route.all()
      .map((route) => ({
        method: route.methods.map((m) => m.toUpperCase()).join('|'),
        uri: normalize(prefix, route.uri),
        name: route.name ?? '',
        action: describeAction(route.handler),
        middleware: route.middleware.map((m) => m.name || 'anonymous').join(', '),
      }))
      .filter((r) => !method || r.method.split('|').includes(method))
      .filter((r) => !name || r.name.includes(name))
      .filter((r) => !path || r.uri.includes(path));

    if (!rows.length) {
      this.comment('No routes found. Declare them with Route.get(...) and import them from the routes file.');
      return 0;
    }

    this.table(
      ['Method', 'URI', 'Name', 'Action', 'Middleware'],
      rows.map((r) => [r.method, r.uri, r.name, r.action, r.middleware]),
    );
    this.newLine();
    this.comment(`${rows.length} route${rows.length === 1 ? '' : 's'}.`);
    return 0;
  }
}
