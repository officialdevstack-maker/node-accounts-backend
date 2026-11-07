# Config pack (Laravel-style `config/`)

Install: `npm i dotenv`  (imports use `.js` extensions for TypeScript ESM / NodeNext)

One file per concern, one typed accessor:

```ts
import { config, Config, env } from './config/index.js';

config('app.name');                        // 'Spurs'
config('mail.mailers.smtp.port');          // number, autocompleted
config('services.paystack.secretKey');
config('app.port', 4000);                  // fallback if missing

Config.has('services.termii.apiKey');
Config.set('mail.default', 'log');         // runtime override (tests)
```

`config/index.ts` imports `dotenv/config` first, so `.env` is always loaded before any config file is evaluated.
You no longer need `import 'dotenv/config'` in your entry file.

## Reading env vars (config/env.ts)
`env.string` · `env.number` · `env.bool` · `env.list` · `env.oneOf` · `env.required`

Bad values fail at boot (`PORT=abc`, `MAIL_MAILER=smpt`) instead of surfacing later as `NaN` or a confusing runtime error.

## Files
| File | Laravel equivalent | Holds |
|---|---|---|
| `app.ts` | config/app.php | name, env, url, port, timezone, CORS |
| `auth.ts` | config/auth.php | JWT, bcrypt, OTP, reset TTL |
| `database.ts` | config/database.php | Sequelize connection + pool |
| `mail.ts` | config/mail.php | mailers, from, retry, layout info |
| `queue.ts` | config/queue.php | driver, tries, backoff, redis |
| `notifications.ts` | | default channels, SMS driver, inbox |
| `services.ts` | config/services.php | Termii, Paystack, Flutterwave |

## Add a new config file
1. Create `config/cache.ts` exporting `cacheConfig`.
2. Import it in `config/index.ts` and add `cache: cacheConfig` to `repository`.
3. `config('cache.ttl')` is now typed everywhere.

## Wiring the existing packs
Replace `mail/config.ts` with the shim in `mail-config-shim.ts` (same exports, so no other mail or notification file changes).
