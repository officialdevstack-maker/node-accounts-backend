import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.table('user_preferences', (t) => {
      t.boolean('login_alerts').default(false);
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropColumn('user_preferences', 'login_alerts');
  }
}
