import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.create('settings', (t) => {
      t.unsignedId();
      t.string('name', 100).unique();
      t.json('value');
      t.timestamps();
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropIfExists('settings');
  }
}
