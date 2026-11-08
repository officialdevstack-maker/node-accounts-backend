import { Migration } from '../Migration.js';
export default class extends Migration {
    async up(schema) {
        await schema.create('access_tokens', (t) => {
            t.unsignedId();
            t.foreignUnsignedId('user_id').constrained('users').cascadeOnDelete();
            t.string('token_hash', 64).unique();
            t.dateTime('expires_at').nullable();
            t.dateTime('last_used_at').nullable();
            t.dateTime('created_at');
            t.dateTime('updated_at');
            t.index('user_id');
        });
    }
    async down(schema) {
        await schema.dropIfExists('access_tokens');
    }
}
//# sourceMappingURL=2026_11_08_000001_create_access_tokens_table.js.map