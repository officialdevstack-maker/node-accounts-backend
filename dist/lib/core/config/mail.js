// config/mail.ts  (Laravel: config/mail.php)
// Source of truth for the mail pack. mail/config.ts re-exports this.
import { env } from './env.js';
export const mailConfig = {
    /** Default mailer (MAIL_MAILER). Use "log" in development to print emails instead of sending. */
    default: env.oneOf('MAIL_MAILER', ['smtp', 'log'], 'smtp'),
    mailers: {
        smtp: {
            host: env.string('MAIL_HOST', 'localhost'),
            port: env.number('MAIL_PORT', 587),
            // true for port 465, false for 587/25 (STARTTLS)
            secure: env.string('MAIL_ENCRYPTION').toLowerCase() === 'ssl',
            auth: env.string('MAIL_USERNAME')
                ? { user: env.string('MAIL_USERNAME'), pass: env.string('MAIL_PASSWORD') }
                : undefined,
        },
        log: {},
    },
    /** Global "from" address (MAIL_FROM_ADDRESS / MAIL_FROM_NAME) */
    from: {
        address: env.string('MAIL_FROM_ADDRESS', 'no-reply@example.com'),
        name: env.string('MAIL_FROM_NAME', env.string('APP_NAME', 'Spurs')),
    },
    /** Retry behaviour for Mail.queue() / Mail.later(). Defaults to the shared queue config. */
    queue: {
        tries: env.number('MAIL_QUEUE_TRIES', env.number('QUEUE_TRIES', 3)),
        backoffMs: env.number('MAIL_QUEUE_BACKOFF_MS', env.number('QUEUE_BACKOFF_MS', 5000)),
    },
    /** Used by the email layout */
    app: {
        name: env.string('APP_NAME', 'Spurs'),
        url: env.string('APP_URL', 'http://localhost:3000'),
        supportEmail: env.string('MAIL_SUPPORT_ADDRESS', 'support@example.com'),
    },
};
//# sourceMappingURL=mail.js.map