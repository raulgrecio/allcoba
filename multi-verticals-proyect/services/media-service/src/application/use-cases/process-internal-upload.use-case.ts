import { logger } from '@allcoba/kernel';

import type { ImagePipelinePort } from '#application/ports/image-pipeline.port.js';
import type { ProcessedImageResult } from '#domain/canonical/processed-image-result.js';

export interface ProcessInternalUploadRequest {
  readonly imageBuffer: Buffer;
  readonly sourceName?: string;
}

/**
 * Caso de Uso: ProcessInternalUpload
 * Orquesta la validación y ejecución del pipeline para imágenes subidas directamente por usuarios.
 */
export class ProcessInternalUploadUseCase {
  private readonly log = logger().child({ component: 'ProcessInternalUploadUseCase' });

  constructor(private readonly imagePipeline: ImagePipelinePort) {}

  async execute(request: ProcessInternalUploadRequest): Promise<ProcessedImageResult> {
    const { imageBuffer, sourceName } = request;
    this.log.info({ sourceName }, 'Starting internal upload image processing pipeline');

    const internalUrl = 'internal://upload';
    const result = await this.imagePipeline.process(imageBuffer, internalUrl, sourceName);

    if (result.status === 'rejected') {
      this.log.warn(
        { rejectReason: result.rejectReason },
        'Internal upload image rejected by pipeline',
      );
    } else {
      this.log.info(
        {
          sha256: result.hashes.sha256,
          hasInjectedInfo: result.adapterAssessment.hasInjectedInfo,
        },
        'Internal upload image processed successfully',
      );
    }

    return result;
  }
}
