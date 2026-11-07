<!-- notifications/README.md -->
# Notification pack (Laravel-style)

Needs the `mail/` pack (mail channel). The database channel uses the query builder and the `notifications` migration.

## 1. Boot
Run `artisan migrate` to create the notifications table.

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

## 3. In-app inbox (database channel)
```ts
await DatabaseNotification.forNotifiable(user.id, { unreadOnly: true });
await DatabaseNotification.unreadCount(user.id);
await DatabaseNotification.markAsRead(notificationId, user.id);
await DatabaseNotification.markAllAsRead(user.id);
```

## 4. Extend
- New notification: copy a file in `messages/`, extend `Notification`, implement `via()` + the `toX()` methods.
- Real SMS provider: `SmsChannel.useDriver({ send: async (to, message) => { /* call Termii, Twilio, etc. */ } })`.
- New channel (push, Slack...): `NotificationManager.extend('push', new PushChannel())`, then return `'push'` from `via()` and add `toPush()` to your notification.
