// notifications/channels/SmsChannel.ts
// Provider-agnostic SMS channel. Plug your provider in with SmsChannel.useDriver(...).
import { routeFor } from '../Notifiable.js';
/** Default driver: prints the SMS instead of sending it (safe for development). */
export class LogSmsDriver {
    async send(to, message) {
        console.log(`[sms:log] to=${to} message="${message}"`);
    }
}
export class SmsChannel {
    static driver = new LogSmsDriver();
    /** e.g. SmsChannel.useDriver({ send: async (to, msg) => { await termii.send(to, msg) } }) */
    static useDriver(driver) {
        this.driver = driver;
    }
    async send(notifiable, notification) {
        if (!notification.toSms) {
            throw new Error(`${notification.type} uses the "sms" channel but has no toSms() method.`);
        }
        const phone = routeFor(notifiable, 'sms');
        if (!phone)
            return;
        await SmsChannel.driver.send(phone, notification.toSms(notifiable));
    }
}
//# sourceMappingURL=SmsChannel.js.map