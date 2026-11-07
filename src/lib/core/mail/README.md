// mail/README.md
# Mail pack (Laravel-style, nodemailer)

Install: `npm i nodemailer && npm i -D @types/nodemailer`
(Imports use `.js` extensions for TypeScript ESM / NodeNext.)

```ts
// anywhere in your app, e.g. controllers/AuthController.ts
import { Mail, WelcomeMail, OtpMail, ResetPasswordMail } from '../mail/index.js';

await Mail.to(user.email).send(new WelcomeMail(user));          // send now
Mail.to(user.email).queue(new OtpMail('482913'));               // fire-and-forget + retries
Mail.to(user.email).later(60_000, new WelcomeMail(user));       // delayed by 60s
await Mail.to(user.email).cc('a@b.com').send(new ResetPasswordMail(user, url));
await Mail.raw('Plain text body', { to: user.email, subject: 'Hello' });
```

Create a new email by copying any file in `mail/mailables/`, extending `Mailable`, and filling `build()`.
