import type { ChannelName, Notifiable } from './types.js';
import type { Notification } from './Notification.js';
/** Resolve where a channel should deliver for this notifiable. */
export declare function routeFor(notifiable: Notifiable, channel: ChannelName): string | undefined;
export declare class AnonymousNotifiable implements Notifiable {
    readonly id = "anonymous";
    private routes;
    route(channel: ChannelName, address: string): this;
    routeNotificationFor(channel: ChannelName): string | undefined;
    notify(notification: Notification): Promise<void>;
}
//# sourceMappingURL=Notifiable.d.ts.map