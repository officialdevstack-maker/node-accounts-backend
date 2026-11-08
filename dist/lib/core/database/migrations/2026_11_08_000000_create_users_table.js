import { Migration } from '../Migration.js';
export default class extends Migration {
    async up(schema) {
        await schema.create('users', (t) => {
            t.unsignedId();
            t.string('fullname');
            t.string('email').unique();
            t.string('password');
            t.string('phone').nullable();
            t.boolean('is_verified').nullable().default(false);
            t.enum('account_type', ['user', 'business', 'developer']).nullable().default('user');
            t.dateTime('created_at');
            t.dateTime('updated_at');
        });
    }
    async down(schema) {
        await schema.dropIfExists('users');
    }
}
//# sourceMappingURL=2026_11_08_000000_create_users_table.js.map