import bcrypt from 'bcryptjs';
import { config } from '../lib/core/config/index.js';
import { DB, type Row } from '../lib/core/query/index.js';

export type AccountType = 'user' | 'business' | 'developer';

export interface User {
  id: number;
  fullname: string;
  email: string;
  phone: string | null;
  isVerified: boolean;
  accountType: AccountType;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends User {
  password: string;
}

const PUBLIC = ['id', 'fullname', 'email', 'phone', 'is_verified', 'account_type', 'created_at', 'updated_at'];

const hydrate = (row: Row): User => ({
  id: Number(row.id),
  fullname: row.fullname,
  email: row.email,
  phone: row.phone ?? null,
  isVerified: Boolean(row.is_verified),
  accountType: row.account_type,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const User = {
  async findById(id: number): Promise<User | null> {
    const row = await DB.table('users').select(...PUBLIC).find(id);
    return row ? hydrate(row) : null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const row = await DB.table('users').select(...PUBLIC).where('email', email).first();
    return row ? hydrate(row) : null;
  },

  /** Only for credential checks. Everything else should use the methods above (no password column). */
  async findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    const row = await DB.table('users').where('email', email).first();
    return row ? { ...hydrate(row), password: row.password } : null;
  },

  async create(input: {
    fullname: string;
    email: string;
    password: string;
    phone?: string | null;
    accountType?: AccountType;
  }): Promise<User> {
    const now = new Date();
    const id = await DB.table('users').insertGetId({
      fullname: input.fullname,
      email: input.email,
      password: await bcrypt.hash(input.password, config('auth.bcryptRounds')),
      phone: input.phone ?? null,
      is_verified: false,
      account_type: input.accountType ?? 'user',
      created_at: now,
      updated_at: now,
    });
    const user = await User.findById(Number(id));
    if (!user) throw new Error('The user was created but could not be loaded.');
    return user;
  },
};
