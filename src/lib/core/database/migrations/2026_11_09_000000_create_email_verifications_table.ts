import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.create('email_verifications', (t) => {
      t.unsignedId();
      t.foreignUnsignedId('user_id').unique().constrained('users').cascadeOnDelete();
      t.string('code_hash', 64);
      t.integer('attempts').default(0);
      t.dateTime('expires_at');
      t.dateTime('created_at');
      t.dateTime('updated_at');
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropIfExists('email_verifications');
  }
}
