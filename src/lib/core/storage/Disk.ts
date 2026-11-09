import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import HttpError from '../../error.js';
import { config } from '../config/index.js';
import { Reply } from '../response/index.js';
import { UrlSigner } from '../routing/UrlSigner.js';
import { contentDisposition, mimeFor, normalizePath, StorageError, toBuffer } from './support.js';
import type { Contents, StorageDriver } from './types.js';

export interface DiskOptions {
  /** Public base URL, e.g. https://api.example.com/storage. Without it url() throws. */
  url?: string | undefined;
}

export interface ResponseOptions {
  /** Force a download instead of showing the file in the browser. */
  download?: boolean;
  /** File name shown to the user (default: the stored name). */
  name?: string;
  type?: string;
}

/** Types a browser would run, so they are never shown inline from your domain. */
const ACTIVE = /^(text\/html|application\/xhtml|image\/svg\+xml|text\/javascript|application\/xml)/;

export class Disk {
  constructor(
    readonly diskName: string,
    private readonly driver: StorageDriver,
    private readonly options: DiskOptions = {},
  ) {}

  /** Normalised path that must point at a file (not the root). */
  private file(path: string): string {
    const clean = normalizePath(path);
    if (!clean) throw new StorageError('A file path is required.', 'EINVAL');
    return clean;
  }

  // ---- reading ---------------------------------------------------------------------------
  exists(path: string): Promise<boolean> {
    return this.driver.exists(this.file(path));
  }

  async missing(path: string): Promise<boolean> {
    return !(await this.exists(path));
  }

  get(path: string): Promise<Buffer> {
    return this.driver.read(this.file(path));
  }

  async text(path: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    return (await this.get(path)).toString(encoding);
  }

  async json<T = unknown>(path: string): Promise<T> {
    return JSON.parse(await this.text(path)) as T;
  }

  readStream(path: string): Promise<Readable> {
    return this.driver.readStream(this.file(path));
  }

  async size(path: string): Promise<number> {
    const info = await this.driver.stat(this.file(path));
    if (!info) throw new StorageError(`File [${path}] was not found.`);
    return info.size;
  }

  async lastModified(path: string): Promise<Date> {
    const info = await this.driver.stat(this.file(path));
    if (!info) throw new StorageError(`File [${path}] was not found.`);
    return new Date(info.modifiedAt);
  }

  /** From the file extension. */
  mimeType(path: string): string {
    return mimeFor(this.file(path));
  }

  // ---- writing --------------------------------------------------------------------------
  async put(path: string, contents: Contents): Promise<void> {
    await this.driver.write(this.file(path), contents instanceof Readable ? contents : toBuffer(contents));
  }

  putJson(path: string, value: unknown, pretty = false): Promise<void> {
    return this.put(path, JSON.stringify(value, null, pretty ? 2 : undefined));
  }

  /** Copy a file from the real disk (e.g. an upload temp file) into this disk. */
  putFrom(path: string, localFile: string): Promise<void> {
    return this.driver.write(this.file(path), createReadStream(localFile));
  }

  /** Save under a random name and return the stored path: store('avatars', buffer, 'png') -> 'avatars/9f1c....png' */
  async store(directory: string, contents: Contents, extension = ''): Promise<string> {
    const ext = extension.replace(/^\./, '');
    if (ext && !/^[a-z0-9]{1,10}$/i.test(ext)) throw new StorageError(`"${extension}" is not a valid file extension.`, 'EINVAL');

    const dir = normalizePath(directory);
    const path = `${dir ? `${dir}/` : ''}${randomUUID()}${ext ? `.${ext.toLowerCase()}` : ''}`;
    await this.put(path, contents);
    return path;
  }

  append(path: string, data: string | Uint8Array): Promise<void> {
    return this.driver.append(this.file(path), toBuffer(data));
  }

  async prepend(path: string, data: string | Uint8Array): Promise<void> {
    const file = this.file(path);
    const existing = (await this.driver.exists(file)) ? await this.driver.read(file) : Buffer.alloc(0);
    await this.driver.write(file, Buffer.concat([toBuffer(data), existing]));
  }

  /** Overwrites the target. */
  copy(from: string, to: string): Promise<void> {
    return this.driver.copy(this.file(from), this.file(to));
  }

  move(from: string, to: string): Promise<void> {
    return this.driver.move(this.file(from), this.file(to));
  }

  /** Returns how many files were actually deleted: delete('a.txt', ['b.txt', 'c.txt']) */
  async delete(...paths: Array<string | string[]>): Promise<number> {
    let removed = 0;
    for (const path of paths.flat()) if (await this.driver.remove(this.file(path))) removed++;
    return removed;
  }

  // ---- directories -----------------------------------------------------------------------
  /** Files directly inside `directory`, as full paths. */
  async files(directory = ''): Promise<string[]> {
    return (await this.driver.list(normalizePath(directory))).files;
  }

  async directories(directory = ''): Promise<string[]> {
    return (await this.driver.list(normalizePath(directory))).directories;
  }

  async allFiles(directory = ''): Promise<string[]> {
    const out: string[] = [];
    const walk = async (current: string): Promise<void> => {
      const listing = await this.driver.list(current);
      out.push(...listing.files);
      for (const child of listing.directories) await walk(child);
    };
    await walk(normalizePath(directory));
    return out;
  }

  async allDirectories(directory = ''): Promise<string[]> {
    const out: string[] = [];
    const walk = async (current: string): Promise<void> => {
      for (const child of (await this.driver.list(current)).directories) {
        out.push(child);
        await walk(child);
      }
    };
    await walk(normalizePath(directory));
    return out;
  }

  makeDirectory(path: string): Promise<void> {
    return this.driver.makeDirectory(normalizePath(path));
  }

  /** Removes the folder and everything inside it. */
  deleteDirectory(path: string): Promise<void> {
    return this.driver.removeDirectory(normalizePath(path));
  }

  // ---- urls and responses ----------------------------------------------------------------
  /** Absolute path on the server disk (local drivers only). */
  path(path = ''): string {
    const root = this.root();
    if (root === undefined || !this.driver.localPath) throw new Error(`Disk [${this.diskName}] is not stored on the local filesystem.`);
    return this.driver.localPath(normalizePath(path));
  }

  /** The folder on the server disk, or undefined for non-local drivers. */
  root(): string | undefined {
    return this.driver.localPath?.('');
  }

  publicUrl(): string | undefined {
    return this.options.url || undefined;
  }

  /** Public URL (public disk): url('avatars/a.png') -> https://host/storage/avatars/a.png */
  url(path: string): string {
    const base = this.options.url;
    if (!base) throw new Error(`Disk [${this.diskName}] has no public url. Set one in config/storage.ts or use temporaryUrl().`);
    return `${base.replace(/\/+$/, '')}/${this.file(path).split('/').map(encodeURIComponent).join('/')}`;
  }

  /**
   * HMAC-signed link that expires, served by the route at config('storage.signedPath')
   * (see the usage section: that route calls Storage.disk(req.query('disk')).response(req.query('path'))).
   */
  temporaryUrl(path: string, expiresInSeconds: number): string {
    const query = new URLSearchParams({ disk: this.diskName, path: this.file(path) });
    return UrlSigner.sign(`${config('storage.signedPath')}?${query.toString()}`, { expiresIn: expiresInSeconds });
  }

  /** Stream the file as an HTTP reply. Missing files become a 404. */
  async response(path: string, options: ResponseOptions = {}): Promise<Reply> {
    const clean = this.file(path);
    const info = await this.driver.stat(clean);
    if (!info) throw HttpError.notFound('File not found.');

    const name = options.name ?? clean.split('/').pop() ?? 'file';
    const type = options.type ?? mimeFor(clean);
    const attachment = options.download === true || ACTIVE.test(type);

    return Reply.stream(await this.driver.readStream(clean), type).headers({
      'Content-Length': String(info.size),
      'Content-Disposition': contentDisposition(name, attachment ? 'attachment' : 'inline'),
      'X-Content-Type-Options': 'nosniff',
    });
  }

  download(path: string, name?: string): Promise<Reply> {
    return this.response(path, { download: true, ...(name ? { name } : {}) });
  }
}
