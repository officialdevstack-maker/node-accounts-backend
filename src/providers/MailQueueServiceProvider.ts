import { config } from '../lib/core/config/index.js';
import { ServiceProvider } from '../lib/core/boot/index.js';
import { MailQueue } from '../lib/core/mail/MailQueue.js';

export class MailQueueServiceProvider extends ServiceProvider {
  async boot(): Promise<void> {
    if (config('queue.driver') === 'redis') await MailQueue.connect(config('queue.redisUrl'));
  }

  async shutdown(): Promise<void> {
    await MailQueue.close();
  }
}
