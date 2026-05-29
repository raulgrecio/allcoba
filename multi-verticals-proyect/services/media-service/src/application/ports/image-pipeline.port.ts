import type { ProcessedImageResult } from '#domain/canonical/processed-image-result.js';

export interface ImagePipelinePort {
  process(buffer: Buffer, url: string, sourceName?: string): Promise<ProcessedImageResult>;
}
