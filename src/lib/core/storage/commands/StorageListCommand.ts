import { Command } from '../../cli/index.js';
import { config } from '../../config/index.js';
import { StorageManager } from '../StorageManager.js';

export class StorageListCommand extends Command {
  readonly signature = 'storage:list';
  readonly description = 'List the storage disks, where they live and their public URL';

  handle(): number {
    const rows = StorageManager.names().map((name) => {
      const disk = StorageManager.disk(name);
      const tags = name === config('storage.default') ? ' (default)' : '';
      return [`${name}${tags}`, disk.root() ?? '(not local)', disk.publicUrl() ?? '-'];
    });

    this.table(['Disk', 'Root', 'Public URL'], rows);
    return 0;
  }
}
