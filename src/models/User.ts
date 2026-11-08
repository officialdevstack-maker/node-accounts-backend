import bcrypt from 'bcryptjs';
import { config } from '../lib/core/config/index.js';
import { Model, type Cast } from '../lib/core/model/index.js';

export type AccountType = 'user' | 'business' | 'developer';

export class User extends Model {
  static table = 'users';
  static fillable = ['fullname', 'email', 'password', 'phone', 'accountType'];
  static hidden = ['password'];
  static columns = { isVerified: 'isVerified', createdAt: 'createdAt', updatedAt: 'updatedAt'};
  static casts: Record<string, Cast> = { id: 'int', isVerified: 'boolean' };

  declare id: number;
  declare fullname: string;
  declare email: string;
  declare password: string;
  declare phone: string | null;
  declare isVerified: boolean;
  declare accountType: AccountType;
  declare createdAt: Date;
  declare updatedAt: Date;

  protected async saving(): Promise<void> {
    if (this.isDirty('password')) this.password = await bcrypt.hash(this.password, config('auth.bcryptRounds'));
  }

  static findByEmail(email: string) {
    return User.where('email', email).first();
  }

  static findByEmailWithPassword(email: string) {
    return User.query().withHidden().where('email', email).first();
  }
}
