// mail/MailQueue.ts
// In-process callback queue plus a BullMQ-backed path for serializable mail payloads.
import { Queue, Worker } from 'bullmq';
import type { SendMailOptions } from 'nodemailer';
import { Readable } from 'node:stream';
import { Redis } from 'ioredis';
import { config } from '../config/index.js';
import { MailManager } from './MailManager.js';
import mailConfig, { type MailerName } from './config.js';

type Job = () => Promise<unknown>;
type QueuedMail = { options: SendMailOptions; mailer: MailerName };

export class MailQueue {
  private static queue: Queue<QueuedMail> | undefined;
  private static worker: Worker<QueuedMail> | undefined;
  private static redis: Redis | undefined;

  static push(job: Job, delayMs = 0): void {
    setTimeout(() => void this.run(job, 1), delayMs);
  }

  static async connect(redisUrl: string): Promise<void> {
    if (this.queue) return;

    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue<QueuedMail>('spurs-mail', { connection: this.redis });
    this.worker = new Worker<QueuedMail>(
      'spurs-mail',
      async (job) => MailManager.deliver(this.restoreBuffers(job.data.options), job.data.mailer),
      { connection: this.redis },
    );
    this.worker.on('error', (error) => console.error('[mail:queue] worker error', error));
    this.worker.on('failed', (job, error) => {
      if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
        console.error(`[mail:queue] job ${job.id ?? '(unknown)'} failed after ${job.attemptsMade} attempts`, error);
      }
    });

    await Promise.all([this.queue.waitUntilReady(), this.worker.waitUntilReady()]);
  }

  static async pushMail(options: SendMailOptions, mailer: MailerName, delayMs = 0): Promise<void> {
    if (!this.queue) {
      this.push(() => MailManager.deliver(options, mailer), delayMs);
      return;
    }

    this.assertSerializable(options);
    const serialized = JSON.stringify(options);
    if (serialized === undefined) throw new Error('Mail options could not be serialized for the Redis queue.');

    await this.queue.add(
      'deliver',
      { options: JSON.parse(serialized) as SendMailOptions, mailer },
      {
        delay: Math.max(0, delayMs),
        attempts: mailConfig.queue.tries,
        backoff: { type: 'exponential', delay: mailConfig.queue.backoffMs },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    );
  }

  static async close(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    this.worker = undefined;
    this.queue = undefined;
    if (this.redis) await this.redis.quit();
    this.redis = undefined;
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

  private static assertSerializable(value: unknown, seen = new WeakSet<object>()): void {
    if (typeof value === 'function' || value instanceof Readable) {
      throw new Error('Redis mail jobs cannot contain functions or streams; use inline content or a file path.');
    }
    if (value === null || typeof value !== 'object' || Buffer.isBuffer(value) || value instanceof Date) return;
    if (seen.has(value)) throw new Error('Redis mail jobs cannot contain circular references.');
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) this.assertSerializable(item, seen);
    } else {
      for (const item of Object.values(value)) this.assertSerializable(item, seen);
    }
    seen.delete(value);
  }

  private static restoreBuffers(value: SendMailOptions): SendMailOptions {
    const restore = (item: unknown): unknown => {
      if (Array.isArray(item)) return item.map(restore);
      if (item === null || typeof item !== 'object') return item;

      const record = item as Record<string, unknown>;
      if (record['type'] === 'Buffer' && Array.isArray(record['data'])) {
        return Buffer.from(record['data'].filter((byte): byte is number => typeof byte === 'number'));
      }
      return Object.fromEntries(Object.entries(record).map(([key, child]) => [key, restore(child)]));
    };

    return restore(value) as SendMailOptions;
  }
}
