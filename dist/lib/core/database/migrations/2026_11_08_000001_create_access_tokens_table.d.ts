import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';
export default class extends Migration {
    up(schema: Schema): Promise<void>;
    down(schema: Schema): Promise<void>;
}
//# sourceMappingURL=2026_11_08_000001_create_access_tokens_table.d.ts.map