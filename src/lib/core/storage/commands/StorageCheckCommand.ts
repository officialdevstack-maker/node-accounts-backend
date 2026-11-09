import { Readable } from 'node:stream';
import { Command } from '../../cli/index.js';
import { config } from '../../config/index.js';
import { UrlSigner } from '../../routing/UrlSigner.js';
import { StorageManager } from '../StorageManager.js';

export class StorageCheckCommand extends Command {
  readonly signature = 'storage:check {--disk= : Disk to test (default: FILESYSTEM_DISK)}';
  readonly description = 'Run the storage pack against a disk (uses a temporary check-* folder)';

  async handle(): Promise<number> {
    const name = this.option('disk') ?? config('storage.default');
    const disk = StorageManager.disk(name);
    const base = `check-${Date.now()}`;
    const p = (file: string) => `${base}/${file}`;

    const results: Array<[string, boolean]> = [];
    const check = (label: string, ok: boolean) => results.push([label, ok]);

    try {
      await disk.put(p('hello.txt'), 'hello');
      check('put + text + exists', (await disk.text(p('hello.txt'))) === 'hello' && (await disk.exists(p('hello.txt'))) && (await disk.missing(p('nope.txt'))));

      await disk.append(p('hello.txt'), ' world');
      await disk.prepend(p('hello.txt'), '>> ');
      check('append and prepend', (await disk.text(p('hello.txt'))) === '>> hello world');
      check('size, mimeType, lastModified', (await disk.size(p('hello.txt'))) === 14
        && disk.mimeType(p('hello.txt')) === 'text/plain'
        && Math.abs(Date.now() - (await disk.lastModified(p('hello.txt'))).getTime()) < 60_000);

      await disk.copy(p('hello.txt'), p('copy.txt'));
      await disk.move(p('copy.txt'), p('moved.txt'));
      check('copy and move', (await disk.exists(p('moved.txt'))) && (await disk.missing(p('copy.txt'))) && (await disk.exists(p('hello.txt'))));

      await disk.putJson(p('data.json'), { a: 1, list: [1, 2] });
      check('putJson + json', JSON.stringify(await disk.json(p('data.json'))) === '{"a":1,"list":[1,2]}');

      await disk.put(p('stream.txt'), Readable.from(['a', 'b']));
      let streamed = '';
      for await (const chunk of await disk.readStream(p('stream.txt'))) streamed += String(chunk);
      check('write and read streams', streamed === 'ab');

      await disk.put(p('a/b/c.txt'), 'deep');
      check('files / directories / allFiles', (await disk.files(base)).length === 4
        && (await disk.directories(base)).join() === `${base}/a`
        && (await disk.allFiles(base)).length === 5
        && (await disk.allDirectories(base)).join() === `${base}/a,${base}/a/b`);

      const stored = await disk.store(base, 'random', 'txt');
      check('store uses a random name', stored.startsWith(`${base}/`) && stored.endsWith('.txt') && (await disk.exists(stored)));

      check('delete counts real deletions', (await disk.delete(p('hello.txt'), p('nope.txt'))) === 1 && (await disk.missing(p('hello.txt'))));

      const escaped = await disk.put('../escape.txt', 'x').then(() => false, () => true);
      check('paths outside the disk are rejected', escaped);

      check('temporaryUrl verifies', UrlSigner.verify(disk.temporaryUrl(p('data.json'), 60)));
    } finally {
      await disk.deleteDirectory(base);
    }

    this.table(['Check', 'Result'], results.map(([label, ok]) => [label, ok ? 'ok' : 'FAILED']));
    this.newLine();

    const failed = results.filter(([, ok]) => !ok).length;
    if (failed) {
      this.error(`${failed} check${failed === 1 ? '' : 's'} failed on [${name}].`);
      return 1;
    }
    this.success(`All ${results.length} checks passed on [${name}].`);
    return 0;
  }
}
