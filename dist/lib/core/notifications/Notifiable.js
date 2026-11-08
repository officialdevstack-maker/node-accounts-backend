/** Resolve where a channel should deliver for this notifiable. */
export function routeFor(notifiable, channel) {
    const custom = notifiable.routeNotificationFor?.(channel);
    if (custom)
        return custom;
    if (channel === 'mail')
        return notifiable.email ?? undefined;
    if (channel === 'sms')
        return notifiable.phone ?? undefined;
    return undefined;
}
export class AnonymousNotifiable {
    id = 'anonymous';
    routes = {};
    route(channel, address) {
        this.routes[channel] = address;
        return this;
    }
    routeNotificationFor(channel) {
        return this.routes[channel];
    }
    async notify(notification) {
        // Lazy import avoids a circular dependency with NotificationManager.
        const { NotificationManager } = await import('./NotificationManager.js');
        return NotificationManager.send(this, notification);
    }
}
//# sourceMappingURL=Notifiable.js.map