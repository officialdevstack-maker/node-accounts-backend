import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../lib/core/config/index.js';
import { DB } from '../lib/core/query/index.js';

const TABLE = 'email_verifications';

export interface EmailVerificationRecord {
  userId: number;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const hash = (userId: number, code: string): string =>
  createHmac('sha256', config('auth.jwt.secret')).update(`${userId}:${code}`).digest('hex');

export const EmailVerification = {
  async issue(userId: number, code: string, ttlMinutes: number): Promise<void> {
    const now = new Date();
    await DB.table(TABLE).upsert(
      [
        {
          user_id: userId,
          code_hash: hash(userId, code),
          attempts: 0,
          expires_at: new Date(now.getTime() + ttlMinutes * 60_000),
          created_at: now,
          updated_at: now,
        },
      ],
      ['user_id'],
      ['code_hash', 'attempts', 'expires_at', 'created_at', 'updated_at'],
    );
  },

  async find(userId: number): Promise<EmailVerificationRecord | null> {
    const row = await DB.table(TABLE).where('user_id', userId).first();
    if (!row) return null;
    return {
      userId: Number(row.user_id),
      codeHash: String(row.code_hash),
      attempts: Number(row.attempts),
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
    };
  },

  matches(record: EmailVerificationRecord, code: string): boolean {
    const storedHash = Buffer.from(record.codeHash, 'hex');
    const candidateHash = Buffer.from(hash(record.userId, code), 'hex');
    return storedHash.length === candidateHash.length && timingSafeEqual(storedHash, candidateHash);
  },

  async recordFailure(userId: number): Promise<void> {
    await DB.table(TABLE).where('user_id', userId).increment('attempts', 1, { updated_at: new Date() });
  },

  async destroy(userId: number): Promise<void> {
    await DB.table(TABLE).where('user_id', userId).delete();
  },
};
