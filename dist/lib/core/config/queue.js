// config/queue.ts  (Laravel: config/queue.php)
// Defaults for the in-process queue. Swap `driver` to 'redis' once you move to BullMQ.
import { env } from './env.js';
export const queueConfig = {
    driver: env.oneOf('QUEUE_DRIVER', ['memory', 'redis'], 'memory'),
    tries: env.number('QUEUE_TRIES', 3),
    backoffMs: env.number('QUEUE_BACKOFF_MS', 5000),
    redis: {
        host: env.string('REDIS_HOST', '127.0.0.1'),
        port: env.number('REDIS_PORT', 6379),
        password: env.string('REDIS_PASSWORD') || undefined,
    },
};
//# sourceMappingURL=queue.js.map