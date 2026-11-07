// mail/MailQueue.ts
// Tiny in-process queue with delay + retries for Mail.queue() / Mail.later().
// NOTE: jobs are lost if the process restarts. For production durability swap this for BullMQ/Redis.
import mailConfig from './config.js';

type Job = () => Promise<unknown>;

export class MailQueue {
  static push(job: Job, delayMs = 0): void {
    setTimeout(() => void this.run(job, 1), delayMs);
  }

  private static async run(job: Job, attempt: number): Promise<void> {
    try {
      await job();
    } catch (error) {
      if (attempt >= mailConfig.queue.tries) {
        console.error(`[mail:queue] failed after ${attempt} attempts`, error);
        return;
      }
      const wait = mailConfig.queue.backoffMs * attempt;
      console.warn(`[mail:queue] attempt ${attempt} failed, retrying in ${wait}ms`);
      setTimeout(() => void this.run(job, attempt + 1), wait);
    }
  }
}
