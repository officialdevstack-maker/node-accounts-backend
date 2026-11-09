import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.create('account_activities', (t) => {
      t.unsignedId();
      t.foreignUnsignedId('user_id').constrained('users').cascadeOnDelete();
      t.string('event', 40);
      t.string('ip_address', 45).nullable();
      t.string('user_agent', 255).nullable();
      t.string('device_name', 120).nullable();
      t.json('meta').nullable();
      t.dateTime('created_at');

      t.index(['user_id', 'created_at']);
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropIfExists('account_activities');
  }
}
