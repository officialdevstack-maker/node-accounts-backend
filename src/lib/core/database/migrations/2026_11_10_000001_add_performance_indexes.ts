import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.table('account_activities', (t) => {
      t.index(['event', 'created_at']);
      t.index(['user_id', 'event', 'device_name']);
    });

    await schema.table('access_tokens', (t) => {
      t.index(['user_id', 'last_used_at']);
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropIndex('account_activities', 'account_activities_event_created_at_index');
    await schema.dropIndex('account_activities', 'account_activities_user_id_event_device_name_index');
    await schema.dropIndex('access_tokens', 'access_tokens_user_id_last_used_at_index');
  }
}
