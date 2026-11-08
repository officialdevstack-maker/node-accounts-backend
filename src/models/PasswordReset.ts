import { createHash, randomBytes } from 'node:crypto';
import { DB } from '../lib/core/query/index.js';

const TABLE = 'password_resets';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export const PasswordReset = {
  async issue(email: string, ttlMinutes: number): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const now = new Date();

    await DB.table(TABLE).where('email', email).delete();
    await DB.table(TABLE).insert({
      email,
      token_hash: sha256(token),
      expires_at: new Date(now.getTime() + ttlMinutes * 60_000),
      created_at: now,
    });

    return token;
  },

  isValid(email: string, token: string): Promise<boolean> {
    return DB.table(TABLE)
      .where('email', email)
      .where('token_hash', sha256(token))
      .where('expires_at', '>', new Date())
      .exists();
  },

  async destroyByEmail(email: string): Promise<void> {
    await DB.table(TABLE).where('email', email).delete();
  },
};
