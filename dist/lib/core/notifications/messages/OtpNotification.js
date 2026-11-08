// notifications/messages/OtpNotification.ts
// Time-sensitive, so it is NOT queued (shouldQueue stays false).
import { OtpMail } from '../../mail/index.js';
import { Notification } from '../Notification.js';
export class OtpNotification extends Notification {
    code;
    expiresInMinutes;
    constructor(code, expiresInMinutes = 10) {
        super();
        this.code = code;
        this.expiresInMinutes = expiresInMinutes;
    }
    via() {
        return ['mail', 'sms'];
    }
    toMail() {
        return new OtpMail(this.code, this.expiresInMinutes);
    }
    toSms() {
        return `Your verification code is ${this.code}. It expires in ${this.expiresInMinutes} minutes. Do not share it.`;
    }
}
//# sourceMappingURL=OtpNotification.js.map