export type MailerName = 'smtp' | 'log';
declare const mailConfig: {
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
    /** In-memory queue behaviour for Mail.queue() / Mail.later() */
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
export default mailConfig;
//# sourceMappingURL=config.d.ts.map