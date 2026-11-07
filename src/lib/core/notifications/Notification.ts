// notifications/Notification.ts
// Base class for every notification, like Illuminate\Notifications\Notification.
import { randomUUID } from 'node:crypto';
import type { Mailable } from '../mail/index.js';
import type { ChannelName, Notifiable } from './types.js';

export abstract class Notification {
  /** Unique id, also used as the primary key in the database channel. */
  readonly id: string = randomUUID();

  /** Set to true to deliver in the background (with retries) instead of awaiting. */
  shouldQueue = false;

  /** Delay in ms before a queued notification is delivered. */
  delayMs = 0;

  /** Notification type stored in the database channel. */
  get type(): string {
    return this.constructor.name;
  }

  /** Which channels this notification should go through. */
  abstract via(notifiable: Notifiable): ChannelName[];

  /** Implement the ones your via() uses. */
  toMail?(notifiable: Notifiable): Mailable;
  toDatabase?(notifiable: Notifiable): Record<string, unknown>;
  toSms?(notifiable: Notifiable): string;
}
