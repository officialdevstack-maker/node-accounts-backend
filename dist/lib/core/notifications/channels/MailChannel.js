// notifications/channels/MailChannel.ts
// Delivers toMail() through the mail pack.
import { Mail } from '../../mail/index.js';
import { routeFor } from '../Notifiable.js';
export class MailChannel {
    async send(notifiable, notification) {
        if (!notification.toMail) {
            throw new Error(`${notification.type} uses the "mail" channel but has no toMail() method.`);
        }
        const address = routeFor(notifiable, 'mail');
        if (!address)
            return; // nowhere to send, skip silently (same as Laravel)
        await Mail.to(address).send(notification.toMail(notifiable));
    }
}
//# sourceMappingURL=MailChannel.js.map