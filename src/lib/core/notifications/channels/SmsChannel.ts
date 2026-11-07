// notifications/channels/SmsChannel.ts
// Provider-agnostic SMS channel. Plug your provider in with SmsChannel.useDriver(...).
import { routeFor } from '../Notifiable.js';
import type { Notification } from '../Notification.js';
import type { Channel, Notifiable } from '../types.js';

export interface SmsDriver {
  send(to: string, message: string): Promise<void>;
}

/** Default driver: prints the SMS instead of sending it (safe for development). */
export class LogSmsDriver implements SmsDriver {
  async send(to: string, message: string): Promise<void> {
    console.log(`[sms:log] to=${to} message="${message}"`);
  }
}

export class SmsChannel implements Channel {
  private static driver: SmsDriver = new LogSmsDriver();

  /** e.g. SmsChannel.useDriver({ send: async (to, msg) => { await termii.send(to, msg) } }) */
  static useDriver(driver: SmsDriver): void {
    this.driver = driver;
  }

  async send(notifiable: Notifiable, notification: Notification): Promise<void> {
    if (!notification.toSms) {
      throw new Error(`${notification.type} uses the "sms" channel but has no toSms() method.`);
    }

    const phone = routeFor(notifiable, 'sms');
    if (!phone) return;

    await SmsChannel.driver.send(phone, notification.toSms(notifiable));
  }
}
