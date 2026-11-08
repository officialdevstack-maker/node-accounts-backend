import { ServiceProvider } from '../lib/core/boot/index.js';
import { Database } from '../lib/core/database/Database.js';
export class DatabaseServiceProvider extends ServiceProvider {
    async boot() {
        await Database.authenticate();
    }
    async shutdown() {
        await Database.close();
    }
}
//# sourceMappingURL=DatabaseServiceProvider.js.map