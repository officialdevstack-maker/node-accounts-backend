import { OtpMail } from '../../mail/index.js';
import { Notification } from '../Notification.js';
import type { ChannelName } from '../types.js';
export declare class OtpNotification extends Notification {
    private code;
    private expiresInMinutes;
    constructor(code: string, expiresInMinutes?: number);
    via(): ChannelName[];
    toMail(): OtpMail;
    toSms(): string;
}
//# sourceMappingURL=OtpNotification.d.ts.map