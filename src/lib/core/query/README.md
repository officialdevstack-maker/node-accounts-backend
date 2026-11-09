# Query pack (Laravel-style multi-dialect query builder)

Needs the `database/` pack (it uses the selected MySQL, PostgreSQL, or SQLite connection) and `cli/`.

```ts
import { DB } from '../lib/core/query/index.js';

await DB.table('users').where('email', email).first();
await DB.table('users').where('account_type', 'user').whereNotNull('phone').orderByDesc('id').limit(20).get();
await DB.table('users').whereIn('id', [1, 2, 3]).pluck('email');
await DB.table('users').where((q) => q.where('isVerified', true).orWhere('account_type', 'developer')).get();

await DB.table('posts as p').join('users as u', 'u.id', 'p.user_id').select('p.id', 'u.fullname as author').get();
await DB.table('orders').select('user_id').selectRaw('sum(amount) as total').groupBy('user_id').having('total', '>', 5000).get();
await DB.table('users').whereExists((q) => q.from('access_tokens').whereColumn('access_tokens.user_id', 'users.id')).count();

await DB.table('users').paginate(15, 2);
await DB.table('users').chunkById(500, async (rows) => { /* ... */ });

await DB.table('wallets').insert({ user_id: 1, balance: 0 });
const id = await DB.table('users').insertGetId({ fullname: 'Ada Obi', email: 'a@b.com', password: hash });
await DB.table('wallets').where('user_id', 1).increment('balance', 5000);
await DB.table('wallets').upsert([{ user_id: 1, currency: 'NGN', balance: 0 }], ['user_id', 'currency'], ['balance']);

await DB.transaction(async (trx) => {
  await trx.table('wallets').where('user_id', 1).decrement('balance', 1000);
  await trx.table('transactions').insert({ user_id: 1, amount: -1000 });
});

DB.table('users').where('id', 1).toSql();
DB.table('users').where('id', 1).toRawSql();
```

Raw SQL values use `?` bindings across all drivers. PostgreSQL converts these to positional bindings; use `??` in raw SQL when a literal `?` operator is needed.
