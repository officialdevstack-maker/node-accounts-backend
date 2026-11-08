import type { Notification } from '../Notification.js';
import type { Channel, Notifiable } from '../types.js';
export interface SmsDriver {
    send(to: string, message: string): Promise<void>;
}
/** Default driver: prints the SMS instead of sending it (safe for development). */
export declare class LogSmsDriver implements SmsDriver {
    send(to: string, message: string): Promise<void>;
}
export declare class SmsChannel implements Channel {
    private static driver;
    /** e.g. SmsChannel.useDriver({ send: async (to, msg) => { await termii.send(to, msg) } }) */
    static useDriver(driver: SmsDriver): void;
    send(notifiable: Notifiable, notification: Notification): Promise<void>;
}
//# sourceMappingURL=SmsChannel.d.ts.map