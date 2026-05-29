import type { JobName } from '@allcoba/shared-types';

export type { JobName };
export { JOB_NAMES } from '@allcoba/shared-types';

export interface JobOptions {
  priority?: number;
  retryLimit?: number;
  startAfter?: number | string | Date;
}

export interface QueuePort {
  /**
   * Publica un nuevo trabajo en la cola.
   */
  publish<T>(name: JobName, data: T, options?: JobOptions): Promise<string | null>;

  /**
   * Se suscribe a un tipo de trabajo para procesarlo.
   */
  subscribe<T>(name: JobName, handler: (data: T) => Promise<void>): Promise<void>;

  /**
   * Programa un trabajo recurrente (cron).
   */
  schedule<T>(name: JobName, cron: string, data: T): Promise<void>;
}
