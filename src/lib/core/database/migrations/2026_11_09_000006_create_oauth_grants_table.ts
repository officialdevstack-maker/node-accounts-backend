import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.create('oauth_grants', (t) => {
      t.unsignedId();
      t.foreignUnsignedId('user_id').constrained('users').cascadeOnDelete();
      t.foreignUnsignedId('oauth_client_id').constrained('oauth_clients').cascadeOnDelete();
      t.json('scopes');
      t.dateTime('last_used_at').nullable();
      t.timestamps();

      t.unique(['user_id', 'oauth_client_id']);
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropIfExists('oauth_grants');
  }
}
