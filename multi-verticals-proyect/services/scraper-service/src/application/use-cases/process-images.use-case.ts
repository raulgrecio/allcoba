import { createHash } from 'crypto';

import type { Vertical } from '@allcoba/shared-types';
import { logger } from '@allcoba/kernel';
import { asImageHash, asProviderId } from '@allcoba/shared-types';

import type { ImagePipelinePort } from '#application/ports/image-pipeline.port.js';
import type { ProviderRepositoryPort } from '#application/ports/repository.port.js';
import type { ScrapedImageRepositoryPort } from '#application/ports/scraped-image-repository.port.js';
import type { StoragePort } from '#application/ports/storage.port.js';
import type { ProfileImage } from '#domain/canonical/profile-image.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { mergeProvider } from '#domain/services/canonical/merge-provider.js';

export interface ProcessImagesJobPayload {
  readonly providerId: string;
  readonly imageUrls: string[];
  readonly source: string;
  readonly vertical: Vertical;
}

export interface ProcessImagesConfig {
  readonly maxImagesToProcess?: number;
}

const DEFAULT_CONFIG: Required<ProcessImagesConfig> = {
  maxImagesToProcess: 20,
};

export class ProcessImagesUseCase {
  private readonly log = logger().child({ component: 'ProcessImagesUseCase' });
  private readonly cfg: Required<ProcessImagesConfig>;

  constructor(
    private readonly repo: ProviderRepositoryPort,
    private readonly storage: StoragePort,
    private readonly imageRepo: ScrapedImageRepositoryPort,
    private readonly imagePipeline: ImagePipelinePort,
    config: ProcessImagesConfig = {},
  ) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
  }

  async execute(payload: ProcessImagesJobPayload): Promise<void> {
    this.log.info(
      { providerId: payload.providerId, imageCount: payload.imageUrls.length },
      'Starting async image processing',
    );

    const provider = await this.repo.findById(asProviderId(payload.providerId));
    if (!provider) {
      this.log.warn(
        { providerId: payload.providerId },
        'Provider not found for async image processing — skip',
      );
      return;
    }

    const externalRef = provider.externalRefs[0];
    if (!externalRef) {
      this.log.warn(
        { providerId: payload.providerId },
        'Provider has no external refs — skip image processing',
      );
      return;
    }

    const processedImages = await this.processImages({
      imageUrls: payload.imageUrls,
      externalId: externalRef.sourceId,
      source: payload.source,
      vertical: payload.vertical,
    });

    if (processedImages.length === 0) {
      this.log.info({ providerId: payload.providerId }, 'No new images processed');
      return;
    }

    const patch: Partial<ScrapedProvider> = {
      images: processedImages,
    };

    const merged = mergeProvider(provider, patch);
    await this.repo.updateById(provider.id, merged);

    this.log.info(
      { providerId: payload.providerId, processedCount: processedImages.length },
      'Provider images updated successfully',
    );
  }

  private async processImages({
    imageUrls,
    externalId,
    source,
    vertical,
  }: {
    imageUrls: string[];
    externalId: string;
    source: string;
    vertical: Vertical;
  }): Promise<ProfileImage[]> {
    const results = await Promise.all(
      imageUrls.slice(0, this.cfg.maxImagesToProcess).map(async (imgUrl, i) => {
        try {
          const urlHash = createHash('sha256').update(imgUrl).digest('hex');

          if (await this.imageRepo.hasUrl(urlHash)) {
            this.log.debug({ imgUrl }, 'Image URL already seen — skip');
            return null;
          }

          const response = await fetch(imgUrl);
          if (!response.ok) {
            this.log.error({ imgUrl, status: response.status }, 'Failed to fetch image URL');
            return null;
          }

          let buffer = Buffer.from((await response.arrayBuffer()) as ArrayBuffer) as Buffer;

          const pipelineResult = await this.imagePipeline.process(buffer, imgUrl, source);
          if (pipelineResult.status === 'rejected') {
            this.log.warn(
              { imgUrl, reason: pipelineResult.rejectReason },
              'Image rejected by processing pipeline — skip and mark seen',
            );
            await this.imageRepo.markSeen(urlHash, imgUrl, externalId, vertical);
            return null;
          }

          buffer = pipelineResult.normalizedBuffer || buffer;
          const hash = asImageHash(pipelineResult.hashes.phash || pipelineResult.hashes.sha256);

          const existing = await this.repo.find({ vertical, imageHash: hash });
          if (existing.length > 0) {
            const existingImg = existing[0]!.images.find((img) => img.hash === hash);
            if (existingImg) {
              await this.imageRepo.markSeen(urlHash, imgUrl, externalId, vertical);
              return { hash, storedUrl: existingImg.storedUrl, originalUrl: imgUrl };
            }
          }

          const slug = externalId.replace(/[^a-z0-9]/gi, '_');
          const storedUrl = await this.storage.upload(
            buffer,
            `images/${source}/${slug}/${String(i).padStart(3, '0')}.webp`,
            'image/webp',
          );

          await this.imageRepo.markSeen(urlHash, imgUrl, externalId, vertical);
          return { hash, storedUrl, originalUrl: imgUrl };
        } catch (error) {
          this.log.error({ imgUrl, error }, 'Error processing image in background');
          return null;
        }
      }),
    );

    return results.filter((r): r is ProfileImage => r !== null);
  }
}
