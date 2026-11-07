// cli/commands/KeyGenerateCommand.ts
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Command } from '../Command.js';
import { CliError } from '../Input.js';

export class KeyGenerateCommand extends Command {
  readonly signature =
    'key:generate {--key=JWT_SECRET : Env variable to set} {--length=48 : Random bytes} {--write : Save into .env instead of printing} {--force : Overwrite without asking}';
  readonly description = 'Generate a random secret (e.g. JWT_SECRET)';

  async handle(): Promise<number> {
    const name = this.option('key')!;
    const length = Number(this.option('length'));

    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) throw new CliError(`"${name}" is not a valid env variable name.`);
    if (!Number.isInteger(length) || length < 16 || length > 256) throw new CliError('--length must be a whole number between 16 and 256.');

    const secret = randomBytes(length).toString('base64url');

    if (!this.flag('write')) {
      this.line(`${name}=${secret}`);
      this.comment('Not saved. Re-run with --write to put it in .env.');
      return 0;
    }

    const envFile = join(process.cwd(), '.env');
    const current = existsSync(envFile) ? await readFile(envFile, 'utf8') : '';
    const pattern = new RegExp(`^${name}=(.*)$`, 'm');
    const existing = current.match(pattern)?.[1]?.split('#')[0]?.trim();

    if (existing && !this.flag('force')) {
      this.warn(`${name} is already set. Replacing it invalidates everything signed with the old value (e.g. all logged-in sessions).`);
      if (!(await this.confirm('Replace it?', false))) {
        this.comment('Nothing changed.');
        return 1;
      }
    }

    const line = `${name}=${secret}`;
    const next = pattern.test(current)
      ? current.replace(pattern, line)
      : `${current}${current && !current.endsWith('\n') ? '\n' : ''}${line}\n`;

    await writeFile(envFile, next, 'utf8');
    this.success(`${name} saved to .env`);
    return 0;
  }
}
