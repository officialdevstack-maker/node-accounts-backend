import type { User } from '../../models/User.js';

export const SCOPE_LABELS: Record<string, string> = {
  openid: 'Confirm who you are',
  profile: 'Your name and account type',
  email: 'Your email address and whether it is verified',
  phone: 'Your phone number',
  offline_access: 'Stay connected when you are not using the app',
};

export const scopeLabels = (scopes: readonly string[]): string[] =>
  scopes.map((scope) => SCOPE_LABELS[scope] ?? scope);

export type Claims = { sub: string } & Record<string, unknown>;

export function claimsFor(
  user: Pick<User, 'id' | 'fullname' | 'email' | 'phone' | 'isVerified' | 'accountType'>,
  scopes: readonly string[],
): Claims {
  const claims: Claims = { sub: String(user.id) };

  if (scopes.includes('profile')) {
    claims.name = user.fullname;
    claims.account_type = user.accountType;
  }
  if (scopes.includes('email')) {
    claims.email = user.email;
    claims.email_verified = Boolean(user.isVerified);
  }
  if (scopes.includes('phone') && user.phone) claims.phone_number = user.phone;

  return claims;
}
