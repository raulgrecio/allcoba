import { logger } from '@allcoba/kernel';

import type { ImagePipelinePort } from '#application/ports/image-pipeline.port.js';
import type { ProcessedImageResult } from '#domain/canonical/processed-image-result.js';
import { config } from '#infrastructure/config/env.js';

export class HttpMediaAdapter implements ImagePipelinePort {
  private readonly log = logger().child({ component: 'HttpMediaAdapter' });
  private readonly mediaServiceUrl: string;

  constructor() {
    this.mediaServiceUrl = config.mediaServiceUrl;
  }

  async process(buffer: Buffer, url: string, sourceName?: string): Promise<ProcessedImageResult> {
    const isRemote = url && (url.startsWith('http://') || url.startsWith('https://'));
    this.log.info(
      { url, isRemote, sourceName },
      'Delegating image processing to media-service via HTTP',
    );

    const body: Record<string, unknown> = { sourceName };
    if (isRemote) {
      body.imageUrl = url;
    } else {
      body.imageBufferBase64 = buffer.toString('base64');
    }

    try {
      const endpoint = `${this.mediaServiceUrl}/media/process`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        this.log.error(
          { status: response.status, statusText: response.statusText },
          'HTTP request to media-service failed',
        );
        throw new Error(`media-service returned status ${response.status}: ${response.statusText}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await response.json()) as Record<string, any>;

      // Reconstruct buffer objects from base64 if present
      const normalizedBuffer = data.normalizedBufferBase64
        ? Buffer.from(data.normalizedBufferBase64, 'base64')
        : undefined;

      const thumbnailBuffer = data.thumbnailBufferBase64
        ? Buffer.from(data.thumbnailBufferBase64, 'base64')
        : undefined;

      const result: ProcessedImageResult = {
        id: data.id,
        url: data.url,
        status: data.status,
        rejectReason: data.rejectReason,
        hashes: data.hashes,
        metadata: {
          format: data.metadata?.format || '',
          width: data.metadata?.width || 0,
          height: data.metadata?.height || 0,
          size: data.metadata?.size || 0,
          exif: data.metadata?.exif,
        },
        ocrText: data.ocrText || '',
        stegoText: data.stegoText || '',
        detected: data.detected || { phones: [], emails: [], urls: [], brands: [] },
        flags: data.flags || { isNSFWCandidate: false, hasSensitiveData: false, hasText: false },
        adapterAssessment: data.adapterAssessment || {
          hasInjectedInfo: false,
          injectedInfoTypes: [],
          injectedInfoDetails: [],
        },
        normalizedBuffer,
        thumbnailBuffer,
      };

      return result;
    } catch (error) {
      this.log.error({ error, url }, 'Failed to delegate image processing to media-service');
      // En caso de fallo de red/conexión, devolvemos un ProcessedImageResult rechazado de forma segura
      return {
        id: '',
        url,
        status: 'rejected',
        rejectReason: `HTTP Delegation Failed: ${error instanceof Error ? error.message : String(error)}`,
        hashes: { sha256: '', phash: '' },
        metadata: { format: '', width: 0, height: 0, size: buffer?.length || 0 },
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
}
