import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.table('users', (t) => {
      t.string('avatar', 255).nullable();
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropColumn('users', 'avatar');
  }
}
