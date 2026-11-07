import { ServiceProvider } from '../lib/core/boot/index.js';
import { Database } from '../lib/core/database/Database.js';

export class DatabaseServiceProvider extends ServiceProvider {
  async boot(): Promise<void> {
    await Database.authenticate();
  }

  async shutdown(): Promise<void> {
    await Database.close();
  }
}
