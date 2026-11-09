import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.table('users', (t) => {
      t.boolean('is_admin').default(false);
      t.dateTime('suspended_at').nullable();
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropColumn('users', 'suspended_at');
    await schema.dropColumn('users', 'is_admin');
  }
}
