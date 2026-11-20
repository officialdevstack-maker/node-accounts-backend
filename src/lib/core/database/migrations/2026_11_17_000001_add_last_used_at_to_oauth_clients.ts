import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.table('oauth_clients', (t) => {
      t.dateTime('last_used_at').nullable();
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropColumn('oauth_clients', 'last_used_at');
  }
}
