import type { Schema } from './Schema.js';
export declare abstract class Migration {
    /** Apply the change. */
    abstract up(schema: Schema): Promise<void> | void;
    /** Undo it exactly (used by migrate:rollback, migrate:reset). */
    abstract down(schema: Schema): Promise<void> | void;
}
//# sourceMappingURL=Migration.d.ts.map