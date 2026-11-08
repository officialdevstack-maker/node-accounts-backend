import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.create('password_resets', (t) => {
      t.unsignedId();
      t.string('email');
      t.string('token_hash', 64).unique();
      t.dateTime('expires_at');
      t.dateTime('created_at');

      t.index('email');
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropIfExists('password_resets');
  }
}
