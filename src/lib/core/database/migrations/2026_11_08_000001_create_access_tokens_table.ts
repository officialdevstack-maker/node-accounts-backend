import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.create('access_tokens', (t) => {
      t.unsignedId();
      t.foreignUnsignedId('user_id').constrained('users').cascadeOnDelete();
      t.string('token_hash', 64).unique();
      t.dateTime('expires_at').nullable();
      t.dateTime('last_used_at').nullable();
      t.dateTime('createdAt').nullable();
      t.dateTime('updatedAt').nullable();

      t.index('user_id');
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropIfExists('access_tokens');
  }
}
