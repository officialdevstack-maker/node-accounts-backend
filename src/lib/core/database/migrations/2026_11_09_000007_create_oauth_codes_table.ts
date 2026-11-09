import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.create('oauth_codes', (t) => {
      t.unsignedId();
      t.foreignUnsignedId('grant_id').constrained('oauth_grants').cascadeOnDelete();
      t.string('code_hash', 64).unique();
      t.string('redirect_uri', 1000);
      t.json('scopes');
      t.string('code_challenge', 128);
      t.string('nonce', 255).nullable();
      t.dateTime('auth_time');
      t.dateTime('expires_at');
      t.dateTime('used_at').nullable();
      t.dateTime('created_at');
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropIfExists('oauth_codes');
  }
}
