// notifications/messages/OtpNotification.ts
// Time-sensitive, so it is NOT queued (shouldQueue stays false).
import { OtpMail } from '../../mail/index.js';
import { Notification } from '../Notification.js';
import type { ChannelName } from '../types.js';

export class OtpNotification extends Notification {
  constructor(
    private code: string,
    private expiresInMinutes = 10,
  ) {
    super();
  }

  via(): ChannelName[] {
    return ['mail', 'sms'];
  }

  toMail() {
    return new OtpMail(this.code, this.expiresInMinutes);
  }

  toSms() {
    return `Your verification code is ${this.code}. It expires in ${this.expiresInMinutes} minutes. Do not share it.`;
  }
}
