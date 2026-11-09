import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.table('access_tokens', (t) => {
      t.string('device_name', 120).nullable();
      t.string('ip_address', 45).nullable();
      t.string('user_agent', 255).nullable();
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropColumn('access_tokens', 'user_agent');
    await schema.dropColumn('access_tokens', 'ip_address');
    await schema.dropColumn('access_tokens', 'device_name');
  }
}
