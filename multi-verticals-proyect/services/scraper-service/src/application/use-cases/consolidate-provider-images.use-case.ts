import { createHash } from 'crypto';

import type { Vertical } from '@allcoba/shared-types';
import { logger } from '@allcoba/kernel';
import { asImageHash, asProviderId } from '@allcoba/shared-types';

import type { ProviderRepositoryPort } from '#application/ports/repository.port.js';
import type { ScrapedImageRepositoryPort } from '#application/ports/scraped-image-repository.port.js';
import type { ProfileImage } from '#domain/canonical/profile-image.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { mergeProvider } from '#domain/services/canonical/merge-provider.js';

export interface ConsolidateProviderImagesPayload {
  readonly providerId: string;
  readonly vertical: Vertical;
  readonly images: Array<{
    readonly originalUrl: string;
    readonly storedUrl: string;
    readonly hash: string;
  }>;
}

export class ConsolidateProviderImagesUseCase {
  private readonly log = logger().child({ component: 'ConsolidateProviderImagesUseCase' });

  constructor(
    private readonly repo: ProviderRepositoryPort,
    private readonly imageRepo: ScrapedImageRepositoryPort,
  ) {}

  async execute(payload: ConsolidateProviderImagesPayload): Promise<void> {
    this.log.info(
      { providerId: payload.providerId, imageCount: payload.images.length },
      'Starting provider images consolidation',
    );

    const provider = await this.repo.findById(asProviderId(payload.providerId));
    if (!provider) {
      this.log.warn(
        { providerId: payload.providerId },
        'Provider not found for images consolidation — skip',
      );
      return;
    }

    const externalRef = provider.externalRefs[0];
    if (!externalRef) {
      this.log.warn(
        { providerId: payload.providerId },
        'Provider has no external refs — skip image consolidation',
      );
      return;
    }

    // Convertir y marcar como vistas todas las imágenes recibidas
    const profileImages: ProfileImage[] = [];

    for (const img of payload.images) {
      try {
        const urlHash = createHash('sha256').update(img.originalUrl).digest('hex');
        await this.imageRepo.markSeen(urlHash, img.originalUrl, externalRef.sourceId, payload.vertical);

        profileImages.push({
          hash: asImageHash(img.hash),
          storedUrl: img.storedUrl,
          originalUrl: img.originalUrl,
        });
      } catch (err) {
        this.log.error(
          { originalUrl: img.originalUrl, error: err },
          'Error marking seen image url during consolidation',
        );
      }
    }

    if (profileImages.length === 0) {
      this.log.info({ providerId: payload.providerId }, 'No new processed images to consolidate');
      return;
    }

    const patch: Partial<ScrapedProvider> = {
      images: profileImages,
    };

    const merged = mergeProvider(provider, patch);
    await this.repo.updateById(provider.id, merged);

    this.log.info(
      { providerId: payload.providerId, consolidatedCount: profileImages.length },
      'Provider images consolidated and stored successfully',
    );
  }
}
