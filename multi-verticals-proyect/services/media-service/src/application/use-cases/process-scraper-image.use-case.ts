import { logger } from '@allcoba/kernel';

import type { ImagePipelinePort } from '#application/ports/image-pipeline.port.js';
import type { ProcessedImageResult } from '#domain/canonical/processed-image-result.js';

export interface ProcessScraperImageRequest {
  readonly imageUrl: string;
  readonly sourceName?: string;
}

/**
 * Caso de Uso: ProcessScraperImage
 * Orquesta la descarga de imágenes externas del scraper y la ejecución del pipeline.
 */
export class ProcessScraperImageUseCase {
  private readonly log = logger().child({ component: 'ProcessScraperImageUseCase' });

  constructor(private readonly imagePipeline: ImagePipelinePort) {}

  async execute(request: ProcessScraperImageRequest): Promise<ProcessedImageResult> {
    const { imageUrl, sourceName } = request;
    this.log.info({ imageUrl, sourceName }, 'Starting scraper image processing pipeline');

    try {
      this.log.debug({ imageUrl }, 'Downloading external image directly in media-service use-case');
      const response = await fetch(imageUrl);
      if (!response.ok) {
        this.log.error({ imageUrl, status: response.status }, 'Failed to download image URL');
        return this.createRejectedResult(
          imageUrl,
          `Failed to download image, HTTP status: ${response.status}`,
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const result = await this.imagePipeline.process(buffer, imageUrl, sourceName);

      this.log.info(
        {
          imageUrl,
          sha256: result.hashes.sha256,
          status: result.status,
        },
        'Scraper image processed successfully',
      );

      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log.error(
        { error: msg, imageUrl },
        'Unexpected error downloading/processing scraper image',
      );
      return this.createRejectedResult(imageUrl, `Unexpected error: ${msg}`);
    }
  }

  private createRejectedResult(url: string, reason: string): ProcessedImageResult {
    return {
      id: '',
      url,
      status: 'rejected',
      rejectReason: reason,
      hashes: { sha256: '', phash: '' },
      metadata: { format: '', width: 0, height: 0, size: 0 },
      ocrText: '',
      stegoText: '',
      detected: { phones: [], emails: [], urls: [], brands: [] },
      flags: { isNSFWCandidate: false, hasSensitiveData: false, hasText: false },
      adapterAssessment: {
        hasInjectedInfo: false,
        injectedInfoTypes: [],
        injectedInfoDetails: [],
      },
    };
  }
}
