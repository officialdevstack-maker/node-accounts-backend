// notifications/Notification.ts
// Base class for every notification, like Illuminate\Notifications\Notification.
import { randomUUID } from 'node:crypto';
export class Notification {
    /** Unique id, also used as the primary key in the database channel. */
    id = randomUUID();
    /** Set to true to deliver in the background (with retries) instead of awaiting. */
    shouldQueue = false;
    /** Delay in ms before a queued notification is delivered. */
    delayMs = 0;
    /** Notification type stored in the database channel. */
    get type() {
        return this.constructor.name;
    }
}
//# sourceMappingURL=Notification.js.map