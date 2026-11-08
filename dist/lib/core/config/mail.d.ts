export type MailerName = 'smtp' | 'log';
export declare const mailConfig: {
    /** Default mailer (MAIL_MAILER). Use "log" in development to print emails instead of sending. */
    default: MailerName;
    mailers: {
        smtp: {
            host: string;
            port: number;
            secure: boolean;
            auth: {
                user: string;
                pass: string;
            } | undefined;
        };
        log: {};
    };
    /** Global "from" address (MAIL_FROM_ADDRESS / MAIL_FROM_NAME) */
    from: {
        address: string;
        name: string;
    };
    /** Retry behaviour for Mail.queue() / Mail.later(). Defaults to the shared queue config. */
    queue: {
        tries: number;
        backoffMs: number;
    };
    /** Used by the email layout */
    app: {
        name: string;
        url: string;
        supportEmail: string;
    };
};
//# sourceMappingURL=mail.d.ts.map