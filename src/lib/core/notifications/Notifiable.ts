// notifications/Notifiable.ts
// Routing helpers + on-demand (anonymous) notifiable, like Notification::route('mail', 'a@b.com').
import type { ChannelName, Notifiable } from './types.js';
import type { Notification } from './Notification.js';

/** Resolve where a channel should deliver for this notifiable. */
export function routeFor(notifiable: Notifiable, channel: ChannelName): string | undefined {
  const custom = notifiable.routeNotificationFor?.(channel);
  if (custom) return custom;

  if (channel === 'mail') return notifiable.email ?? undefined;
  if (channel === 'sms') return notifiable.phone ?? undefined;
  return undefined;
}

export class AnonymousNotifiable implements Notifiable {
  readonly id = 'anonymous';
  private routes: Record<string, string> = {};

  route(channel: ChannelName, address: string): this {
    this.routes[channel] = address;
    return this;
  }

  routeNotificationFor(channel: ChannelName): string | undefined {
    return this.routes[channel];
  }

  async notify(notification: Notification): Promise<void> {
    // Lazy import avoids a circular dependency with NotificationManager.
    const { NotificationManager } = await import('./NotificationManager.js');
    return NotificationManager.send(this, notification);
  }
}
