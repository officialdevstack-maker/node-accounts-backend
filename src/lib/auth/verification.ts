import { randomInt } from 'node:crypto';
import { config } from '../core/config/index.js';
import { Mail, OtpMail } from '../core/mail/index.js';
import { EmailVerification } from '../../models/EmailVerification.js';
import type { User } from '../../models/User.js';

export interface SendResult {
  sent: boolean;
  retryAfter: number;
}

export async function sendVerificationCode(user: Pick<User, 'id' | 'email'>): Promise<SendResult> {
  const cooldown = config('auth.otp.resendSeconds');
  const existing = await EmailVerification.find(user.id);

  if (existing) {
    const wait = Math.ceil((existing.createdAt.getTime() + cooldown * 1000 - Date.now()) / 1000);
    if (wait > 0) return { sent: false, retryAfter: wait };
  }

  const length = config('auth.otp.length');
  const ttl = config('auth.otp.ttlMinutes');
  const code = String(randomInt(0, 10 ** length)).padStart(length, '0');

  await EmailVerification.issue(user.id, code, ttl);

  try {
    await Mail.to(user.email).send(new OtpMail(code, ttl));
  } catch (error) {
    await EmailVerification.destroy(user.id);
    throw error;
  }

  return { sent: true, retryAfter: cooldown };
}
