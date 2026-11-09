// src/models/EmailVerification.ts
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../lib/core/config/index.js';
import { Model, type Cast } from '../lib/core/model/index.js';

const hash = (userId: number, code: string): string =>
  createHmac('sha256', config('auth.jwt.secret')).update(`${userId}:${code}`).digest('hex');

export class EmailVerification extends Model {
  static table = 'email_verification_codes'; // must match the migration
  static fillable = ['userId', 'codeHash', 'attempts', 'expiresAt'];
  static hidden = ['codeHash'];
  static casts: Record<string, Cast> = {
    id: 'int',
    userId: 'int',
    attempts: 'int',
    expiresAt: 'date',
    createdAt: 'date',
    updatedAt: 'date',
  };
  static columns: Record<string, string> = {
    userId: 'user_id',
    codeHash: 'code_hash',
    expiresAt: 'expires_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };

  declare id: number;
  declare userId: number;
  declare codeHash: string;
  declare attempts: number;
  declare expiresAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;

  /** The user's current code row (one per user), with the hidden hash loaded so matches() works. */
  static forUser(userId: number) {
    return EmailVerification.query().withHidden().where('user_id', userId).first();
  }

  /** Creates or replaces the user's code. */
  static async issue(userId: number, code: string, ttlMinutes: number): Promise<EmailVerification> {
    const data = {
      codeHash: hash(userId, code),
      attempts: 0,
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
    };

    const existing = await EmailVerification.forUser(userId);
    if (existing) return existing.update(data);
    return EmailVerification.create({ userId, ...data });
  }

  /** Delete the user's row, if any (after a successful verification). */
  static async destroy(userId: number): Promise<void> {
    const existing = await EmailVerification.forUser(userId);
    if (existing) await existing.delete();
  }

  isExpired(): boolean {
    return this.expiresAt.getTime() <= Date.now();
  }

  matches(code: string): boolean {
    const stored = Buffer.from(String(this.getHidden('codeHash')), 'hex');
    const candidate = Buffer.from(hash(this.userId, code), 'hex');
    return stored.length === candidate.length && timingSafeEqual(stored, candidate);
  }

  async recordFailure(): Promise<void> {
    await this.increment('attempts', 1);
  }
}