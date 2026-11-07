import { ServiceProvider } from '../lib/core/boot/index.js';
import { Database } from '../lib/core/database/Database.js';
import { initDatabaseNotification } from '../lib/core/notifications/index.js';
import db from '../lib/database.js';

export class DatabaseServiceProvider extends ServiceProvider {
  register(): void {
    initDatabaseNotification(db);
  }

  async boot(): Promise<void> {
    await db.authenticate();
  }

  async shutdown(): Promise<void> {
    await Database.close();
  }
}
