import { logger } from '@allcoba/kernel';
import { JOB_NAMES } from '@allcoba/shared-types';

import type { QueuePort } from '../application/ports/queue.port.js';
import { RunImagePipelineUseCase } from '../application/use-cases/run-image-pipeline.use-case.js';
import { ImagePipelineAdapter } from '../infrastructure/adapters/images/image-pipeline.adapter.js';
import { PgBossQueueAdapter } from '../infrastructure/adapters/queue/pg-boss.adapter.js';
import { config } from '../infrastructure/config/env.js';

export class Container {
  private static instance: Container;

  public readonly imagePipeline = new ImagePipelineAdapter();
  public readonly runImagePipelineUseCase = new RunImagePipelineUseCase(this.imagePipeline);
  public readonly queue?: QueuePort;

  private constructor() {
    if (config.queueEnabled && config.databaseUrl) {
      this.queue = new PgBossQueueAdapter(config.databaseUrl);
    }
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Arranca la cola de pg-boss y registra el consumidor asíncrono.
   * Esto implementa la comunicación de Fase 2 (Cola directa scraper-media).
   */
  public async startQueue(): Promise<void> {
    if (!this.queue) return;

    await this.queue.start();

    // Nos suscribimos a la tarea de procesamiento asíncrono 'process-provider-images'
    await this.queue.subscribe(
      JOB_NAMES.PROCESS_PROVIDER_IMAGES,
      async (payload: { imageUrl: string; sourceName?: string }) => {
        logger().info({ imageUrl: payload.imageUrl }, 'Processing background queue media task');

        try {
          const response = await fetch(payload.imageUrl);
          if (!response.ok) {
            throw new Error(`Fetch failed with status ${response.status}: ${response.statusText}`);
          }
          const buffer = Buffer.from(await response.arrayBuffer());

          const result = await this.imagePipeline.process(
            buffer,
            payload.imageUrl,
            payload.sourceName,
          );
          logger().info(
            { id: result.id, status: result.status },
            'Queue media task processed successfully',
          );

          // [FASE 2]: Aquí es donde guardaríamos los buffers en R2 y registraríamos en la tabla 'media_assets' de la DB
        } catch (error) {
          logger().error(
            { error, imageUrl: payload.imageUrl },
            'Failed to process queue media task',
          );
          throw error;
        }
      },
    );
  }

  /**
   * Detiene el consumidor de colas de forma segura al apagar el servidor.
   */
  public async stopQueue(): Promise<void> {
    if (this.queue) {
      await this.queue.stop();
    }
  }
}
