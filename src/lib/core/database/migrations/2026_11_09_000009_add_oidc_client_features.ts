import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.table('oauth_clients', (t) => {
      t.string('backchannel_logout_uri', 2048).nullable();
      t.boolean('client_credentials_enabled').default(false);
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropColumn('oauth_clients', 'client_credentials_enabled');
    await schema.dropColumn('oauth_clients', 'backchannel_logout_uri');
  }
}
