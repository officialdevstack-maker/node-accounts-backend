import type { Disk, DiskOptions } from './Disk.js';
import { StorageManager } from './StorageManager.js';
import type { StorageDriver } from './types.js';

interface Facade {
  disk(name?: string): Disk;
  extend(name: string, driver: () => StorageDriver, options?: DiskOptions): void;
  fake(name?: string): Disk;
}

/** Every Disk method is forwarded to the default disk, with full typing. */
export const Storage = new Proxy({} as Disk & Facade, {
  get(_target, prop) {
    if (prop === 'disk') return (name?: string) => StorageManager.disk(name);
    if (prop === 'extend') return (name: string, driver: () => StorageDriver, options?: DiskOptions) => StorageManager.extend(name, driver, options);
    if (prop === 'fake') return (name?: string) => StorageManager.fake(name);

    const disk = StorageManager.disk();
    const value: unknown = Reflect.get(disk, prop, disk);
    return typeof value === 'function' ? value.bind(disk) : value;
  },
});
