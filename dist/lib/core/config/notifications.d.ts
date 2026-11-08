export declare const notificationsConfig: {
    /** Used when a notification does not define its own via() */
    defaultChannels: string[];
    sms: {
        /** 'log' prints SMS to the console; 'termii' sends through Termii */
        driver: "log" | "termii";
        senderId: string;
    };
    database: {
        table: string;
        /** Max rows returned by DatabaseNotification.forNotifiable() */
        inboxLimit: number;
    };
};
//# sourceMappingURL=notifications.d.ts.map