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
      t.boolean('isVerified').default(false);
      t.enum('account_type', ['user', 'business', 'developer']).default('user');
      t.dateTime('createdAt').nullable();
      t.dateTime('updatedAt').nullable();
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropIfExists('users');
  }
}
