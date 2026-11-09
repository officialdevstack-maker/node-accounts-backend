import { randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { appendFile, copyFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { StorageError } from '../support.js';
import type { DirectoryListing, FileStat, StorageDriver } from '../types.js';

/** Temp files written by write(), hidden from listings. */
const TEMP = /\.[0-9a-f]{8}\.tmp$/;
const NOT_FOUND = new Set(['ENOENT', 'ENOTDIR', 'EISDIR']);
const code = (error: unknown): string | undefined => (error as NodeJS.ErrnoException).code;

export class LocalDriver implements StorageDriver {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  localPath(path: string): string {
    const full = resolve(this.root, path);
    if (full !== this.root && !full.startsWith(this.root + sep)) {
      throw new StorageError(`Path "${path}" is outside the disk.`, 'EINVAL');
    }
    return full;
  }

  private async guard<T>(path: string, task: () => Promise<T>): Promise<T> {
    try {
      return await task();
    } catch (error) {
      const errno = code(error);
      if (errno && NOT_FOUND.has(errno)) throw new StorageError(`File [${path}] was not found.`);
      throw error;
    }
  }

  async exists(path: string): Promise<boolean> {
    return (await this.stat(path)) !== undefined;
  }

  read(path: string): Promise<Buffer> {
    return this.guard(path, () => readFile(this.localPath(path)));
  }

  async readStream(path: string): Promise<Readable> {
    if (!(await this.exists(path))) throw new StorageError(`File [${path}] was not found.`);
    return createReadStream(this.localPath(path));
  }

  /** Written to a temp file then renamed, so a reader never sees half a file. */
  async write(path: string, contents: Buffer | Readable): Promise<void> {
    const file = this.localPath(path);
    await mkdir(dirname(file), { recursive: true });
    const temp = `${file}.${randomBytes(4).toString('hex')}.tmp`;

    try {
      if (Buffer.isBuffer(contents)) await writeFile(temp, contents);
      else await pipeline(contents, createWriteStream(temp));
      await rename(temp, file);
    } catch (error) {
      await rm(temp, { force: true });
      throw error;
    }
  }

  async append(path: string, contents: Buffer): Promise<void> {
    const file = this.localPath(path);
    await mkdir(dirname(file), { recursive: true });
    await appendFile(file, contents);
  }

  async remove(path: string): Promise<boolean> {
    if (!(await this.exists(path))) return false;
    await rm(this.localPath(path), { force: true });
    return true;
  }

  async copy(from: string, to: string): Promise<void> {
    await mkdir(dirname(this.localPath(to)), { recursive: true });
    await this.guard(from, () => copyFile(this.localPath(from), this.localPath(to)));
  }

  async move(from: string, to: string): Promise<void> {
    await mkdir(dirname(this.localPath(to)), { recursive: true });
    await this.guard(from, () => rename(this.localPath(from), this.localPath(to)));
  }

  async stat(path: string): Promise<FileStat | undefined> {
    try {
      const info = await stat(this.localPath(path));
      return info.isFile() ? { size: info.size, modifiedAt: info.mtimeMs } : undefined;
    } catch (error) {
      const errno = code(error);
      if (errno && NOT_FOUND.has(errno)) return undefined;
      throw error;
    }
  }

  async list(directory: string): Promise<DirectoryListing> {
    let entries;
    try {
      entries = await readdir(this.localPath(directory), { withFileTypes: true });
    } catch (error) {
      const errno = code(error);
      if (errno && NOT_FOUND.has(errno)) return { files: [], directories: [] };
      throw error;
    }

    const full = (name: string) => (directory ? `${directory}/${name}` : name);
    const sorted = entries.sort((a, b) => a.name.localeCompare(b.name));
    return {
      files: sorted.filter((e) => e.isFile() && !TEMP.test(e.name)).map((e) => full(e.name)),
      directories: sorted.filter((e) => e.isDirectory()).map((e) => full(e.name)),
    };
  }

  async makeDirectory(path: string): Promise<void> {
    await mkdir(this.localPath(path), { recursive: true });
  }

  async removeDirectory(path: string): Promise<void> {
    await rm(this.localPath(path), { recursive: true, force: true });
  }
}
