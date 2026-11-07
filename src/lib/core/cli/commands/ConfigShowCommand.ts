// cli/commands/ConfigShowCommand.ts
// config:show              -> whole tree
// config:show mail.from    -> one branch
// config:show app.name     -> one value
import { Command } from '../Command.js';
import { CliError } from '../Input.js';

const SENSITIVE = /(password|pass|secret|token|hash|api_?key)/i;

function mask(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map((v) => mask(v, key));

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mask(v, k)]));
  }

  return typeof value === 'string' && value !== '' && SENSITIVE.test(key) ? '********' : value;
}

export class ConfigShowCommand extends Command {
  readonly signature = 'config:show {key? : Dot path, e.g. mail.from.address} {--reveal : Show secrets instead of masking them}';
  readonly description = 'Display configuration values (secrets are masked)';

  async handle(): Promise<number> {
    const { Config } = await import('../../config/index.js');

    const key = this.argument('key');
    const missing = Symbol('missing');

    const raw: unknown = key ? Config.get(key as never, missing as never) : Config.all();
    if (raw === missing) throw new CliError(`Configuration key [${key}] does not exist.`);

    const leafKey = key?.split('.').pop() ?? '';
    const value = this.flag('reveal') ? raw : mask(raw, leafKey);

    this.line(typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value));
    return 0;
  }
}
