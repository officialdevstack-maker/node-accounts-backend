import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';
export default class extends Migration {
    up(schema: Schema): Promise<void>;
    down(schema: Schema): Promise<void>;
}
//# sourceMappingURL=2026_11_07_000000_create_notifications_table.d.ts.map