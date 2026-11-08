import bcrypt from 'bcryptjs';
import { config } from '../lib/core/config/index.js';
import { DB } from '../lib/core/query/index.js';
const PUBLIC = ['id', 'fullname', 'email', 'phone', 'is_verified', 'account_type', 'created_at', 'updated_at'];
const hydrate = (row) => ({
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
    async findById(id) {
        const row = await DB.table('users').select(...PUBLIC).find(id);
        return row ? hydrate(row) : null;
    },
    async findByEmail(email) {
        const row = await DB.table('users').select(...PUBLIC).where('email', email).first();
        return row ? hydrate(row) : null;
    },
    /** Only for credential checks. Everything else should use the methods above (no password column). */
    async findByEmailWithPassword(email) {
        const row = await DB.table('users').where('email', email).first();
        return row ? { ...hydrate(row), password: row.password } : null;
    },
    async create(input) {
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
        if (!user)
            throw new Error('The user was created but could not be loaded.');
        return user;
    },
};
//# sourceMappingURL=User.js.map