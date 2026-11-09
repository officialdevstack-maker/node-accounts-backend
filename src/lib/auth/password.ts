import bcrypt from 'bcryptjs';

const DUMMY_PASSWORD_HASH = '$2b$12$lSTYcmShFRGyY6adrilzquz1pLg1vmW3GDjZMinDJfwYzDjpxzJVG';

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return false;
  }
  return bcrypt.compare(password, hash);
}
