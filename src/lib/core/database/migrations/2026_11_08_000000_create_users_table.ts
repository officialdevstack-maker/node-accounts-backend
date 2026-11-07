import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
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

  async down(schema: Schema): Promise<void> {
    await schema.dropIfExists('users');
  }
}
