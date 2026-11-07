// database/commands/report.ts
// Prints one "name ........ 12ms DONE" line per migration.
import type { Output } from '../../cli/index.js';
import type { MigratorEvent } from '../Migrator.js';

export function reportEvent(io: Output, event: MigratorEvent): void {
  const label = `${event.name}`;
  const time = `${event.ms}ms`;
  const dots = io.style('gray', '.'.repeat(Math.max(3, 70 - label.length - time.length)));
  const verdict = event.type === 'migrated' ? io.style('green', 'DONE') : io.style('yellow', 'REVERTED');
  io.line(`  ${label} ${dots} ${time} ${verdict}`);
}
