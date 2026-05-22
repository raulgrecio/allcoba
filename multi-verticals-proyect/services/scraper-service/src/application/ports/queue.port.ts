export interface JobOptions {
  priority?: number;
  retryLimit?: number;
  startAfter?: number | string | Date;
}

export interface QueuePort {
  /**
   * Publica un nuevo trabajo en la cola.
   */
  publish<T = unknown>(name: string, data: T, options?: JobOptions): Promise<string | null>;

  /**
   * Se suscribe a un tipo de trabajo para procesarlo.
   */
  subscribe<T = unknown>(name: string, handler: (data: T) => Promise<void>): Promise<void>;

  /**
   * Programa un trabajo recurrente (cron).
   */
  schedule<T = unknown>(name: string, cron: string, data: T): Promise<void>;
}
