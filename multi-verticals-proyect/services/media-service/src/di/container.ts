import { logger } from '@allcoba/kernel';
import { JOB_NAMES } from '@allcoba/shared-types';

import type { QueuePort } from '../application/ports/queue.port.js';
import { ProcessInternalUploadUseCase } from '../application/use-cases/process-internal-upload.use-case.js';
import { ProcessScraperImageUseCase } from '../application/use-cases/process-scraper-image.use-case.js';
import { ImagePipelineAdapter } from '../infrastructure/adapters/images/image-pipeline.adapter.js';
import { PgBossQueueAdapter } from '../infrastructure/adapters/queue/pg-boss.adapter.js';
import { config } from '../infrastructure/config/env.js';

export class Container {
  private static instance: Container;

  public readonly imagePipeline = new ImagePipelineAdapter();
  public readonly processScraperImageUseCase = new ProcessScraperImageUseCase(this.imagePipeline);
  public readonly processInternalUploadUseCase = new ProcessInternalUploadUseCase(
    this.imagePipeline,
  );
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

    // Nos suscribimos a la tarea de procesamiento asíncrono 'process-provider-images' (Scraper)
    await this.queue.subscribe(
      JOB_NAMES.PROCESS_PROVIDER_IMAGES,
      async (payload: { imageUrl: string; sourceName?: string }) => {
        logger().info({ imageUrl: payload.imageUrl }, 'Processing background queue media task');

        const result = await this.processScraperImageUseCase.execute({
          imageUrl: payload.imageUrl,
          sourceName: payload.sourceName,
        });

        if (result.status === 'rejected') {
          throw new Error(`Queue scraper image processing rejected: ${result.rejectReason}`);
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
