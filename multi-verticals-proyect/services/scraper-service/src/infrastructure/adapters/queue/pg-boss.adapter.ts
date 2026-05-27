import { PgBoss } from 'pg-boss';

import { logger } from '@allcoba/kernel';

import type { JobOptions, QueuePort } from '#application/ports/queue.port.js';

export class PgBossQueueAdapter implements QueuePort {
  private boss: PgBoss;

  constructor(databaseUrl: string) {
    this.boss = new PgBoss(databaseUrl);

    this.boss.on('error', (error: unknown) => {
      logger().error({ error }, 'Error en pg-boss');
    });
  }

  async start(): Promise<void> {
    await this.boss.start();
    logger().info('pg-boss adapter started');
  }

  async publish<T = unknown>(name: string, data: T, options?: JobOptions): Promise<string | null> {
    try {
      const id = await this.boss.send(name, data as object, {
        priority: options?.priority,
        retryLimit: options?.retryLimit,
        startAfter: options?.startAfter,
      });
      return id;
    } catch (error) {
      logger().error({ error, jobName: name }, 'Error publicando job en pg-boss');
      return null;
    }
  }

  async subscribe<T = unknown>(name: string, handler: (data: T) => Promise<void>): Promise<void> {
    // pg-boss tipa el callback de work() de forma distinta entre versiones.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.boss.work(name, async (job: any) => {
      try {
        await handler(job.data as T);
      } catch (error) {
        logger().error({ error, jobId: job.id, jobName: name }, 'Error procesando job en pg-boss');
        throw error; // pg-boss gestionará el reintento
      }
    });
  }

  async schedule<T = unknown>(name: string, cron: string, data: T): Promise<void> {
    await this.boss.schedule(name, cron, data as object);
  }

  async stop(): Promise<void> {
    await this.boss.stop();
  }
}
