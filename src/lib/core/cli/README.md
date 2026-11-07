# CLI pack (Laravel-style `artisan`)

Zero dependencies. Needs the `config/` and `mail/` packs (and `notifications/` for `make:notification`).

## Install
1. Unzip so `cli/`, `commands/` and `artisan.ts` sit **next to** your `mail/`, `config/` and `notifications/` folders
   (project root, or `src/` if that's where your packs live).
2. Add a script to `package.json` (`npm i -D tsx` if you don't have it):
   ```json
   "scripts": { "artisan": "tsx artisan.ts" }
   ```
   If the packs live in `src/`, use `"artisan": "tsx src/artisan.ts"`. Always run it from the project root so `.env` is found.

```bash
npm run artisan -- list
npm run artisan -- help make:notification
npm run artisan -- make:mail invoice
```

## Built-in commands
| Command | What it does |
|---|---|
| `list` | All commands |
| `about` | App, environment, drivers (no secrets) |
| `config:show [key] [--reveal]` | Print config, secrets masked unless `--reveal` |
| `key:generate [--key=JWT_SECRET] [--length=48] [--write] [--force]` | Random secret; `--write` saves to `.env` and asks before replacing an existing one |
| `mail:test <to> [--mailer=] [--subject=]` | Send a plain test email |
| `mail:verify [--mailer=]` | Check SMTP connection + credentials |
| `make:mail <name> [--force]` | New Mailable in `mail/mailables/` |
| `make:notification <name> [--channels=mail,database] [--force]` | New Notification; also creates its Mailable when `mail` is a channel |
| `make:command <name> [--command=ns:name] [--force]` | New command in `commands/` |
| `make:pack <name> [--description=] [--force]` | New pack folder (`pack.ts` + `commands/`), found automatically |
| `pack:list` | Registered packs and the commands each one adds |

Packs can add more (the `database/` pack adds `migrate`, `migrate:rollback`, `make:migration`, `db:seed` ...). Run `list` to see everything.

The generators add the new class to your `mail/index.ts` / `notifications/index.ts` barrel,
append the `Mail` / `Notification` suffix if you leave it off (`wallet-debited` -> `WalletDebitedNotification`),
and never overwrite an existing file without `--force`.

## Packs (register a whole feature with the CLI)
A pack is a folder next to `cli/` (mail/, database/, billing/ ...) that ships its own commands.
Put a `pack.ts` in it and artisan finds it on every run. There is no list to edit.

```bash
npm run artisan -- make:pack billing --description="Invoices and payouts"
npm run artisan -- billing:info        # works straight away
npm run artisan -- pack:list
```
```ts
// billing/pack.ts
import { definePack } from '../cli/index.js';
import { InvoiceSendCommand } from './commands/InvoiceSendCommand.js';

export default definePack({
  name: 'billing',                       // lowercase, unique
  description: 'Invoices and payouts',
  commands: [InvoiceSendCommand],        // classes extending Command
});
```
- `make:pack mail` on an existing folder only adds what is missing; it never overwrites your files.
- Load order, later wins: built-ins, then packs, then your own `commands/` folder. `pack:list` flags a pack command that replaces an existing one.
- A pack that fails to load (missing dependency, typo) is reported on stderr and skipped, so one broken pack never locks you out of the other commands.
- Pack commands can import the generator helpers: `import { Command, appPath, writeFileSafe, className } from '../../cli/index.js'`.
- From code: `Kernel.registerPack(pack)`.

## Write your own command
```bash
npm run artisan -- make:command SendReports --command=reports:send
```
```ts
// commands/SendReportsCommand.ts  (auto-discovered, no registration needed)
import { Command } from '../cli/index.js';
import { config } from '../config/index.js';

export default class SendReportsCommand extends Command {
  readonly signature = 'reports:send {period=daily : daily or weekly} {--dry-run : Do not send}';
  readonly description = 'Email the sales report';

  async handle() {
    const period = this.argument('period');       // string
    if (this.flag('dry-run')) return this.warn('Dry run.');

    const sure = await this.confirm('Send to all admins?');
    if (!sure) return 1;                          // return a number to set the exit code

    this.table(['Period', 'App'], [[period!, config('app.name')]]);
    this.success('Sent.');
  }
}
```

### Signature syntax
| | |
|---|---|
| `{name}` | required argument |
| `{name?}` | optional argument |
| `{name=World}` | argument with default |
| `{--force}` | boolean flag (`this.flag('force')`) |
| `{--queue=}` | option needing a value (`this.option('queue')`) |
| `{--queue=high}` | option with a default |
| `{--Q\|queue=}` | with a shortcut: `-Q high` |
| `{name : text}` | description shown by `help` |

### Helpers inside `handle()`
`this.line / info / success / warn / comment / error / title / table(headers, rows)`
`await this.ask(q, default) / confirm(q, default) / choice(q, choices, default)`
Prompts return their default automatically when there is no TTY (CI, pipes), so scripts never hang.

### From code / tests
```ts
import { Kernel } from './cli/index.js';
await Kernel.call('mail:test', ['a@b.com', '--mailer=log']);   // resolves to the exit code
```

## Notes
- Exit codes: `0` ok, `1` failure (so CI and shell `&&` work).
- Set `APP_DEBUG=true` to see stack traces on unexpected errors.
- Colours turn off when piped or when `NO_COLOR` is set.
- A command that runs forever (a worker) should simply `await` until it is stopped. The process is force-exited shortly after `handle()` returns.
