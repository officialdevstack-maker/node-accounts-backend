import { Readable } from 'node:stream';
import { collect, StorageError } from '../support.js';
import type { DirectoryListing, FileStat, StorageDriver } from '../types.js';

interface Entry {
  data: Buffer;
  modifiedAt: number;
}

export class MemoryDriver implements StorageDriver {
  private readonly files = new Map<string, Entry>();
  private readonly directories = new Set<string>();

  private entry(path: string): Entry {
    const found = this.files.get(path);
    if (!found) throw new StorageError(`File [${path}] was not found.`);
    return found;
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async read(path: string): Promise<Buffer> {
    return Buffer.from(this.entry(path).data);
  }

  async readStream(path: string): Promise<Readable> {
    return Readable.from([Buffer.from(this.entry(path).data)]);
  }

  async write(path: string, contents: Buffer | Readable): Promise<void> {
    const data = Buffer.isBuffer(contents) ? Buffer.from(contents) : await collect(contents);
    this.files.set(path, { data, modifiedAt: Date.now() });
  }

  async append(path: string, contents: Buffer): Promise<void> {
    const existing = this.files.get(path)?.data ?? Buffer.alloc(0);
    this.files.set(path, { data: Buffer.concat([existing, contents]), modifiedAt: Date.now() });
  }

  async remove(path: string): Promise<boolean> {
    return this.files.delete(path);
  }

  async copy(from: string, to: string): Promise<void> {
    this.files.set(to, { data: Buffer.from(this.entry(from).data), modifiedAt: Date.now() });
  }

  async move(from: string, to: string): Promise<void> {
    const entry = this.entry(from);
    this.files.delete(from);
    this.files.set(to, { data: entry.data, modifiedAt: Date.now() });
  }

  async stat(path: string): Promise<FileStat | undefined> {
    const entry = this.files.get(path);
    return entry ? { size: entry.data.length, modifiedAt: entry.modifiedAt } : undefined;
  }

  async list(directory: string): Promise<DirectoryListing> {
    const prefix = directory ? `${directory}/` : '';
    const files: string[] = [];
    const directories = new Set<string>();

    for (const key of this.files.keys()) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const slash = rest.indexOf('/');
      if (slash === -1) files.push(key);
      else directories.add(prefix + rest.slice(0, slash));
    }
    for (const dir of this.directories) {
      if (!dir.startsWith(prefix) || dir === directory) continue;
      directories.add(prefix + dir.slice(prefix.length).split('/')[0]!);
    }
    return { files: files.sort(), directories: [...directories].sort() };
  }

  async makeDirectory(path: string): Promise<void> {
    if (path) this.directories.add(path);
  }

  async removeDirectory(path: string): Promise<void> {
    const prefix = path ? `${path}/` : '';
    for (const key of [...this.files.keys()]) if (!prefix || key.startsWith(prefix)) this.files.delete(key);
    for (const dir of [...this.directories]) if (!path || dir === path || dir.startsWith(prefix)) this.directories.delete(dir);
  }
}
