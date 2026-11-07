import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Request } from 'express';
import { Command } from '../../cli/index.js';
import { config } from '../../config/index.js';
import { RateLimiter } from '../RateLimiter.js';

export class LimiterListCommand extends Command {
  readonly signature =
    'limiter:list {--file=src/middleware/kernel.ts : File that imports your limiters (relative to the project root)}';
  readonly description = 'List the named rate limiters and their limits';

  async handle(): Promise<number> {
    const relative = this.option('file')!;
    const file = join(process.cwd(), relative);

    if (existsSync(file)) await import(pathToFileURL(file).href);
    else this.comment(`${relative} not found.`);

    const names = RateLimiter.names();
    if (!names.length) {
      this.comment("No named limiters. Register one with RateLimiter.for('api', (req) => Limit.perMinute(120).by(req.ip)).");
      return 0;
    }

    const probe = { ip: '127.0.0.1', body: {}, query: {}, params: {}, headers: {}, get: () => undefined } as unknown as Request;

    const rows: string[][] = [];
    for (const name of names) {
      let detail: string;
      try {
        const result = await RateLimiter.limiter(name)!(probe);
        detail = [result].flat().map((limit) => limit.describe()).join(' + ');
      } catch {
        detail = '(depends on the request)';
      }
      rows.push([name, `throttle:${name}`, detail]);
    }

    this.table(['Limiter', 'Use as', 'Limits'], rows);
    this.newLine();
    this.comment(config('ratelimit.enabled') ? 'Rate limiting is ENABLED.' : 'Rate limiting is DISABLED (RATE_LIMIT_ENABLED=false).');
    return 0;
  }
}
