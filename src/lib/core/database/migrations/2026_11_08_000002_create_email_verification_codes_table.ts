// src/lib/core/database/migrations/2026_11_08_000002_create_email_verification_codes_table.ts
import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.create('email_verification_codes', (t) => {
      t.unsignedId();
      t.foreignUnsignedId('user_id').constrained('users').cascadeOnDelete().unique(); // must match users.id (INT UNSIGNED)
      t.string('code_hash', 64);
      t.dateTime('expires_at');
      t.integer('attempts').default(0);
      t.timestamps();
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropIfExists('email_verification_codes');
  }
}