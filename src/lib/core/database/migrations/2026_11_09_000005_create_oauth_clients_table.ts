import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.create('oauth_clients', (t) => {
      t.unsignedId();
      t.string('client_id', 64).unique();
      t.string('secret_hash', 64).nullable();
      t.string('name', 120);
      t.string('description', 255).nullable();
      t.string('logo_uri', 255).nullable();
      t.enum('type', ['first_party', 'third_party']).default('third_party');
      t.json('redirect_uris');
      t.json('post_logout_redirect_uris');
      t.json('allowed_scopes');
      t.boolean('is_active').default(true);
      t.timestamps();
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropIfExists('oauth_clients');
  }
}
