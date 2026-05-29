import type { Job } from 'pg-boss';
import { PgBoss } from 'pg-boss';

import type { JobName } from '@allcoba/shared-types';
import { logger } from '@allcoba/kernel';

import type { QueuePort } from '#application/ports/queue.port.js';

export class PgBossQueueAdapter implements QueuePort {
  private readonly boss: PgBoss;
  private readonly log = logger().child({ component: 'PgBossQueueAdapter' });

  constructor(databaseUrl: string) {
    this.boss = new PgBoss(databaseUrl);

    this.boss.on('error', (error: unknown) => {
      this.log.error({ error }, 'Error in pg-boss inside media-service');
    });
  }

  async start(): Promise<void> {
    await this.boss.start();
    this.log.info('pg-boss media queue consumer started');
  }

  async publish<T>(name: JobName, data: T): Promise<string | null> {
    const id = await this.boss.send(name, data as object);
    return id || null;
  }

  async subscribe<T>(name: JobName, handler: (data: T) => Promise<void>): Promise<void> {
    // pg-boss tipa el callback de work() de forma distinta entre versiones (como un array Job<unknown>[]).
    // Para evitar errores de tipo al acceder a propiedades individuales y dar soporte a cualquier versión,
    // usamos 'any' para el parámetro y lo casteamos limpiamente a Job<T> para mantener el tipado interno.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.boss.work(name, async (job: any): Promise<void> => {
      const singleJob = job as Job<T>;
      this.log.info({ jobName: name, jobId: singleJob.id }, 'Received background job from queue');
      try {
        await handler(singleJob.data);
      } catch (error) {
        this.log.error(
          { error, jobId: singleJob.id, jobName: name },
          'Error processing job inside pg-boss media worker',
        );
        throw error; // pg-boss will handle retrying based on policy
      }
    });
  }

  async stop(): Promise<void> {
    await this.boss.stop();
    this.log.info('pg-boss media queue consumer stopped');
  }
}
