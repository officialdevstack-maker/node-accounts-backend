// storage/pack.ts
// Found automatically by artisan (every <folder>/pack.ts next to cli/ is loaded). No registration needed.
import { definePack } from '../cli/index.js';
import { StorageCheckCommand } from './commands/StorageCheckCommand.js';
import { StorageListCommand } from './commands/StorageListCommand.js';

export default definePack({
  name: 'storage',
  description: 'Storage facade: local, public and in-memory disks, signed temporary URLs and storage:* commands',
  commands: [StorageListCommand, StorageCheckCommand],
});
