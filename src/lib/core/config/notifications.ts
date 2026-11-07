// config/notifications.ts
// Channel defaults for the notifications pack.
import { env } from './env.js';

export const notificationsConfig = {
  /** Used when a notification does not define its own via() */
  defaultChannels: env.list('NOTIFICATION_CHANNELS', ['mail', 'database']),

  sms: {
    /** 'log' prints SMS to the console; 'termii' sends through Termii */
    driver: env.oneOf('SMS_DRIVER', ['log', 'termii'] as const, 'log'),
    senderId: env.string('SMS_SENDER_ID', 'Spurs'),
  },

  database: {
    table: env.string('NOTIFICATIONS_TABLE', 'notifications'),
    /** Max rows returned by DatabaseNotification.forNotifiable() */
    inboxLimit: env.number('NOTIFICATIONS_INBOX_LIMIT', 50),
  },
};
