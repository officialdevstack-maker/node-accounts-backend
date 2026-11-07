// database/migrations/2026_11_07_000000_create_notifications_table.ts
// Table behind the notifications pack's "database" channel (see notifications/models/DatabaseNotification.ts).
import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.create('notifications', (t) => {
      t.uuid('id').primary();
      t.string('type', 120);
      t.string('notifiable_id', 64);
      t.json('data');
      t.dateTime('read_at').nullable();
      t.timestamps();

      t.index(['notifiable_id', 'read_at']);
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropIfExists('notifications');
  }
}
