import { logger } from '@allcoba/kernel';
import { JOB_NAMES } from '@allcoba/shared-types';

import type { QueuePort } from '../application/ports/queue.port.js';
import { ProcessInternalUploadUseCase } from '../application/use-cases/process-internal-upload.use-case.js';
import { ProcessScraperImageUseCase } from '../application/use-cases/process-scraper-image.use-case.js';
import { ImagePipelineAdapter } from '../infrastructure/adapters/images/image-pipeline.adapter.js';
import { PgBossQueueAdapter } from '../infrastructure/adapters/queue/pg-boss.adapter.js';
import { LocalStorageAdapter } from '../infrastructure/adapters/storage/local-storage.adapter.js';
import { config } from '../infrastructure/config/env.js';

export class Container {
  private static instance: Container;

  public readonly imagePipeline = new ImagePipelineAdapter();
  public readonly storage = new LocalStorageAdapter();
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
    const queue = this.queue;
    if (!queue) return;

    await queue.start();

    // Nos suscribimos a la tarea de procesamiento asíncrono 'process-media' (Scraper)
    await queue.subscribe(
      JOB_NAMES.PROCESS_MEDIA,
      async (payload: {
        providerId: string;
        imageUrls: string[];
        source: string;
        vertical: string;
      }) => {
        logger().info(
          { providerId: payload.providerId, imageCount: payload.imageUrls.length },
          'Processing background queue media task',
        );

        const processedImages: Array<{ originalUrl: string; storedUrl: string; hash: string }> = [];

        for (let i = 0; i < payload.imageUrls.length; i++) {
          const imageUrl = payload.imageUrls[i]!;
          try {
            const result = await this.processScraperImageUseCase.execute({
              imageUrl,
              sourceName: payload.source,
            });

            if (result.status === 'ok' && result.normalizedBuffer) {
              const slug = payload.providerId.replace(/[^a-z0-9]/gi, '_');
              const fileName = `images/${payload.source}/${slug}/${String(i).padStart(3, '0')}.webp`;

              const storedUrl = await this.storage.upload(
                result.normalizedBuffer,
                fileName,
                'image/webp',
              );

              const hash = result.hashes.phash || result.hashes.sha256;
              processedImages.push({
                originalUrl: imageUrl,
                storedUrl,
                hash,
              });
            } else {
              logger().warn(
                { imageUrl, reason: result.rejectReason },
                'Image rejected by media-service pipeline',
              );
            }
          } catch (err) {
            logger().error(
              { imageUrl, error: err },
              'Failed to process scraper image in queue worker',
            );
          }
        }

        // Publicamos el evento de finalización para que el scraper consolide los datos
        await queue.publish(JOB_NAMES.PROVIDER_IMAGES_PROCESSED, {
          providerId: payload.providerId,
          vertical: payload.vertical,
          images: processedImages,
        });

        logger().info(
          { providerId: payload.providerId, processedCount: processedImages.length },
          'Background media task finished and scraper notified',
        );
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
