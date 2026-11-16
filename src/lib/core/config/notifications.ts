// config/notifications.ts
// Connection details for the shared admin-2 notification service.
import { env } from './env.js';

export const notificationsConfig = {
  serviceUrl: env.string('NOTIFICATIONS_SERVICE_URL'),
  serviceApiKey: env.string('NOTIFICATIONS_SERVICE_API_KEY'),

  /** Max rows returned by DatabaseNotification.forNotifiable() */
  inboxLimit: env.number('NOTIFICATIONS_INBOX_LIMIT', 50),
};
