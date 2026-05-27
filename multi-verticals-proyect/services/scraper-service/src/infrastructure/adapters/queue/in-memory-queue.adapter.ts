import { logger } from '@allcoba/kernel';

import type { JobOptions, QueuePort } from '#application/ports/queue.port.js';

export class InMemoryQueueAdapter implements QueuePort {
  private readonly subscribers = new Map<string, Array<(data: unknown) => Promise<void>>>();

  async publish<T = unknown>(name: string, data: T, _options?: JobOptions): Promise<string | null> {
    const jobId = Math.random().toString(36).substring(2, 11);
    logger().debug({ jobName: name, jobId }, 'Publishing job in-memory');

    const handlers = this.subscribers.get(name) || [];
    for (const handler of handlers) {
      // Execute asynchronously to mimic a background worker and avoid blocking the caller
      setTimeout(async () => {
        try {
          await handler(data);
        } catch (error) {
          logger().error({ error, jobId, jobName: name }, 'Error processing job in-memory');
        }
      }, 0);
    }

    return jobId;
  }

  async subscribe<T = unknown>(name: string, handler: (data: T) => Promise<void>): Promise<void> {
    if (!this.subscribers.has(name)) {
      this.subscribers.set(name, []);
    }
    this.subscribers.get(name)!.push(handler as (data: unknown) => Promise<void>);
    logger().debug({ jobName: name }, 'Subscribed to in-memory job');
  }

  async schedule<T = unknown>(name: string, _cron: string, data: T): Promise<void> {
    logger().debug({ jobName: name }, 'Scheduling in-memory job (simulated)');
    await this.publish(name, data);
  }
}
