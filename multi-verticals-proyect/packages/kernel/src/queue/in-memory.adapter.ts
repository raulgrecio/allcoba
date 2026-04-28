import { randomUUID } from 'node:crypto';
import type { QueuePort, JobHandler, PublishOptions, Job } from './queue.port.js';

export class InMemoryQueueAdapter implements QueuePort {
  private handlers = new Map<string, Set<JobHandler>>();
  private jobs: Job[] = [];

  async publish<T>(
    jobName: string,
    data: T,
    _options?: PublishOptions,
  ): Promise<string> {
    const id = randomUUID();
    this.jobs.push({ id, name: jobName, data });
    const handlers = this.handlers.get(jobName);
    if (handlers) {
      for (const handler of handlers) {
        await handler({ id, name: jobName, data });
      }
    }
    return id;
  }

  async subscribe<T>(
    jobName: string,
    handler: JobHandler<T>,
  ): Promise<void> {
    const handlers = this.handlers.get(jobName) ?? new Set();
    handlers.add(handler as JobHandler);
    this.handlers.set(jobName, handlers);
  }

  async unsubscribe(jobName: string): Promise<void> {
    this.handlers.delete(jobName);
  }

  async close(): Promise<void> {
    this.handlers.clear();
    this.jobs = [];
  }

  getPendingJobs(): ReadonlyArray<Job> {
    return [...this.jobs];
  }

  getPendingJobsByName(name: string): ReadonlyArray<Job> {
    return this.jobs.filter((j) => j.name === name);
  }

  clear(): void {
    this.jobs = [];
    this.handlers.clear();
  }
}
