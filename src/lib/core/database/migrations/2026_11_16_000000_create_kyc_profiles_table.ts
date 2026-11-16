import { Migration } from '../Migration.js';
import type { Schema } from '../Schema.js';

export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.create('kyc_profiles', (t) => {
      t.unsignedId();
      t.foreignUnsignedId('user_id').unique().constrained('users').cascadeOnDelete();
      t.enum('status', ['pending', 'verified', 'rejected']).default('pending');
      t.string('bvn_masked', 11);
      t.string('bvn_hash', 64).index();
      t.text('bvn_encrypted');
      t.string('full_name', 180);
      t.date('date_of_birth');
      t.string('phone', 20);
      t.string('rejection_reason', 500).nullable();
      t.string('reviewed_by', 255).nullable();
      t.dateTime('submitted_at');
      t.dateTime('reviewed_at').nullable();
      t.timestamps();
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropIfExists('kyc_profiles');
  }
}
