import { resolve } from 'node:path';
import { config } from '../config/index.js';
import { Disk, type DiskOptions } from './Disk.js';
import { LocalDriver } from './drivers/LocalDriver.js';
import { MemoryDriver } from './drivers/MemoryDriver.js';
import type { StorageDriver } from './types.js';

type Factory = () => Disk;

export class StorageManager {
  private static factories = new Map<string, Factory>([
    [
      'local',
      () =>
        new Disk('local', new LocalDriver(resolve(process.cwd(), config('storage.disks.local.root'))), {
          url: config('storage.disks.local.url') || undefined,
        }),
    ],
    [
      'public',
      () =>
        new Disk('public', new LocalDriver(resolve(process.cwd(), config('storage.disks.public.root'))), {
          url: config('storage.disks.public.url') || undefined,
        }),
    ],
  ]);
  private static disks = new Map<string, Disk>();

  /** StorageManager.extend('s3', () => new S3Driver(...), { url: 'https://cdn...' }) */
  static extend(name: string, driver: () => StorageDriver, options: DiskOptions = {}): void {
    this.factories.set(name, () => new Disk(name, driver(), options));
    this.disks.delete(name);
  }

  static disk(name: string = config('storage.default')): Disk {
    const cached = this.disks.get(name);
    if (cached) return cached;

    const factory = this.factories.get(name);
    if (!factory) throw new Error(`Storage disk [${name}] is not defined. Register it with StorageManager.extend('${name}', ...).`);

    const disk = factory();
    this.disks.set(name, disk);
    return disk;
  }

  static names(): string[] {
    return [...this.factories.keys()];
  }

  /** Swap a disk for an in-memory one (tests). Returns it so you can assert on it. */
  static fake(name: string = config('storage.default')): Disk {
    const real = this.disk(name);
    const fake = new Disk(name, new MemoryDriver(), { url: real.publicUrl() });
    this.disks.set(name, fake);
    return fake;
  }

  /** Forget the cached disks, including fakes. */
  static reset(): void {
    this.disks.clear();
  }
}
