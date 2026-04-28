export interface PublishOptions {
  readonly retryLimit?: number;
  readonly retryDelay?: number;
  readonly startAfter?: Date;
}

export interface Job<T = unknown> {
  readonly id: string;
  readonly name: string;
  readonly data: T;
}

export type JobHandler<T = unknown> = (job: Job<T>) => Promise<void>;

export interface QueuePort {
  publish<T>(
    jobName: string,
    data: T,
    options?: PublishOptions,
  ): Promise<string>;

  subscribe<T>(jobName: string, handler: JobHandler<T>): Promise<void>;

  unsubscribe(jobName: string): Promise<void>;

  close(): Promise<void>;
}
