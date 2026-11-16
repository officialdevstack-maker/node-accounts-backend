// notifications/channels/SmsChannel.ts
// Provider-agnostic SMS channel. Plug your provider in with SmsChannel.useDriver(...).
import { sendNotification } from '../client.js';
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
  private static driver: SmsDriver | undefined;

  /** Override delivery locally; by default admin-2 sends the SMS. */
  static useDriver(driver: SmsDriver): void {
    this.driver = driver;
  }

  async send(notifiable: Notifiable, notification: Notification): Promise<void> {
    if (!notification.toSms) {
      throw new Error(`${notification.type} uses the "sms" channel but has no toSms() method.`);
    }

    const phone = routeFor(notifiable, 'sms');
    if (!phone) return;

    const message = notification.toSms(notifiable);
    if (SmsChannel.driver) {
      await SmsChannel.driver.send(phone, message);
      return;
    }

    await sendNotification({
      id: notification.id,
      notifiableId: String(notifiable.id),
      type: notification.type,
      queue: false,
      delayMs: 0,
      channels: { sms: { to: phone, message } },
    });
  }
}
