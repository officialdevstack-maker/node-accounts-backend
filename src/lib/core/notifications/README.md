<!-- notifications/README.md -->
# Notification pack (Laravel-style)

Built-in email, SMS, and inbox delivery is handled by the shared `admin-2` notification API.
Configure `NOTIFICATIONS_SERVICE_URL` and `NOTIFICATIONS_SERVICE_API_KEY` in the Accounts backend;
create a separate API key for Accounts in admin-2 and keep it server-side. Apply admin-2 migrations
with `npm run db:migrate`. Queued email and SMS use admin-2's Postgres outbox and need its
`GET /api/cron/notifications` worker scheduled at least once per minute.

## 1. Boot
The old Accounts notifications table is retained for existing installations, but new inbox entries
are stored centrally in admin-2.

## 2. Send
```ts
import { Notify, WelcomeNotification, OtpNotification, WalletCreditedNotification } from '../notifications/index.js';

await Notify.send(user, new WelcomeNotification(user.fullname));         // mail + database
await Notify.send(user, new OtpNotification('482913'));                  // mail + sms (not queued)
await Notify.send(user, new WalletCreditedNotification(5000, ref, 12000)); // queued + retries
await Notify.send(users, new WelcomeNotification('Team'));               // many at once
await Notify.route('mail', 'a@b.com').notify(new OtpNotification('1234')); // on-demand
```
`user` needs `id`, and `email` / `phone` for those channels (or a `routeNotificationFor(channel)` method).
Email content is rendered by the Accounts mailables, then sent using the SMTP settings saved in admin-2.
Simple `replyTo` and priority settings are preserved; attachments and multiple recipients are rejected
because the shared API accepts one recipient per notification.

## 3. In-app inbox (database channel)
```ts
await DatabaseNotification.forNotifiable(user.id, { unreadOnly: true });
await DatabaseNotification.unreadCount(user.id);
await DatabaseNotification.markAsRead(notificationId, user.id);
await DatabaseNotification.markAllAsRead(user.id);
```

## 4. Extend
- New notification: copy a file in `messages/`, extend `Notification`, implement `via()` + the `toX()` methods.
- Configure real SMS delivery in admin-2 with `SMS_DRIVER=termii` and its Termii credentials. The log driver does not send SMS.
- Custom channels registered with `NotificationManager.extend()` still run in Accounts; built-in channels use the central service.
