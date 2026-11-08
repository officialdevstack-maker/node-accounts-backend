// mail/config.ts
// Equivalent of Laravel's config/mail.php
// Make sure your .env is loaded before this file is imported (e.g. `import 'dotenv/config'` in your entry file).
const mailConfig = {
    /** Default mailer (MAIL_MAILER). Use "log" in development to print emails instead of sending. */
    default: (process.env.MAIL_MAILER ?? 'smtp'),
    mailers: {
        smtp: {
            host: process.env.MAIL_HOST ?? 'localhost',
            port: Number(process.env.MAIL_PORT ?? 587),
            // true for port 465, false for 587/25 (STARTTLS)
            secure: (process.env.MAIL_ENCRYPTION ?? '').toLowerCase() === 'ssl',
            auth: process.env.MAIL_USERNAME
                ? {
                    user: process.env.MAIL_USERNAME,
                    pass: process.env.MAIL_PASSWORD ?? '',
                }
                : undefined,
        },
        log: {},
    },
    /** Global "from" address (MAIL_FROM_ADDRESS / MAIL_FROM_NAME) */
    from: {
        address: process.env.MAIL_FROM_ADDRESS ?? 'no-reply@example.com',
        name: process.env.MAIL_FROM_NAME ?? process.env.APP_NAME ?? 'Spurs',
    },
    /** In-memory queue behaviour for Mail.queue() / Mail.later() */
    queue: {
        tries: Number(process.env.MAIL_QUEUE_TRIES ?? 3),
        backoffMs: Number(process.env.MAIL_QUEUE_BACKOFF_MS ?? 5000),
    },
    /** Used by the email layout */
    app: {
        name: process.env.APP_NAME ?? 'Spurs',
        url: process.env.APP_URL ?? 'http://localhost:3000',
        supportEmail: process.env.MAIL_SUPPORT_ADDRESS ?? 'support@example.com',
    },
};
export default mailConfig;
//# sourceMappingURL=config.js.map