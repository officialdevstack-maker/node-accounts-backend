# Model pack

The model pack adds an active-record-style layer over the query builder and registers `make:model`.

```ts
import { Model, type Cast } from '../lib/core/model/index.js';

export class User extends Model {
  static table = 'users';
  static fillable = ['fullname', 'email', 'password'];
  static hidden = ['password'];
  static casts: Record<string, Cast> = { isVerified: 'boolean' };

  declare id: number;
  declare fullname: string;
  declare email: string;
  declare password: string;
  declare isVerified: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

const user = await User.where('email', 'ada@example.com').first();
```

Declare model attributes with `declare` so emitted class fields do not shadow the model's attribute proxy. Queries use database column names; model attributes and serialized object keys use camelCase by default. Hidden columns are not retained by default. Use `withHidden()` and `getHidden()` when an operation explicitly needs one; hidden attributes assigned in code remain writable and dirty-tracked.

Use `static columns` for explicit attribute-to-column mappings when a name cannot round-trip through camelCase conversion:

```ts
static columns = { address2: 'address_2' };
```

Run `artisan make:model Wallet` to create a model under `src/models`. Use `--migration` to also create its table migration.

Models may set `static versionColumn = 'version'` to enable optimistic locking on updates, or `static transactional = true` to run saves and deletes with their hooks in a transaction. `increment()` and `decrement()` perform atomic column updates; use `Model.query().lockForUpdate()` when a row must be locked inside a transaction. A `saving`, `creating`, `updating`, or `deleting` hook may return `false` to cancel the operation without writing.
