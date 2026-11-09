import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.create('user_preferences', (t) => {
      t.unsignedId();
      t.foreignUnsignedId('user_id').unique().constrained('users').cascadeOnDelete();
      t.boolean('new_device_alerts').default(true);
      t.timestamps();
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropIfExists('user_preferences');
  }
}
