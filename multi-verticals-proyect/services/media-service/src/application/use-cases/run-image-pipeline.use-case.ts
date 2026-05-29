import { logger } from '@allcoba/kernel';

import type { ImagePipelinePort } from '#application/ports/image-pipeline.port.js';
import type { ProcessedImageResult } from '#domain/canonical/processed-image-result.js';

/**
 * Caso de Uso: RunImagePipeline
 * Orquesta la ejecución del pipeline completo para un buffer de imagen scrapeada o subida.
 */
export class RunImagePipelineUseCase {
  private readonly log = logger().child({ component: 'RunImagePipelineUseCase' });

  constructor(private readonly imagePipeline: ImagePipelinePort) {}

  async execute(buffer: Buffer, url: string, sourceName?: string): Promise<ProcessedImageResult> {
    this.log.info({ url, sourceName }, 'Starting image processing pipeline');
    const result = await this.imagePipeline.process(buffer, url, sourceName);

    if (result.status === 'rejected') {
      this.log.warn(
        { url, rejectReason: result.rejectReason },
        'Image rejected by processing pipeline',
      );
    } else {
      this.log.info(
        {
          url,
          sha256: result.hashes.sha256,
          hasInjectedInfo: result.adapterAssessment.hasInjectedInfo,
        },
        'Image processed successfully by pipeline',
      );
    }

    return result;
  }
}
