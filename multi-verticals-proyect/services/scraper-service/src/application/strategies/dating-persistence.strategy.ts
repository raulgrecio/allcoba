/**
 * DatingPersistenceStrategy — dating-vertical consolidation pipeline.
 *
 * Encapsulates what used to live inline in `ScrapeUrlUseCase.executeV2`:
 *
 *   1. Multi-criteria lookup (phone + externalRef) for consolidation
 *      candidates.
 *   2. Domain `ConsolidationService` decides CREATE / MERGE /
 *      FLAG_FOR_REVIEW / IGNORE.
 *   3. Image processing: hash + dedup-by-hash across the vertical + upload
 *      to storage.
 *   4. Priority-aware `mergeProvider` so manual Presenter fields are never
 *      overwritten by scraper data.
 *   5. Write via `repo.create(enriched)` (CREATE) or
 *      `repo.updateById(merged.id, merged)` (MERGE/FLAG).
 *
 * Splitting this out keeps the dating-specific concerns isolated from the
 * generic v2 orchestration in the use case.
 */

import { Buffer } from 'buffer';

import type { Vertical } from '@allcoba/shared-types';
import { logger } from '@allcoba/kernel';
import { asImageHash } from '@allcoba/shared-types';

import type { ImageHasherPort } from '#application/ports/image-hasher.port.js';
import type {
  PersistContext,
  PersistenceStrategyPort,
  PersistResult,
} from '#application/ports/persistence-strategy.port.js';
import type { ProviderRepositoryPort } from '#application/ports/repository.port.js';
import type { StoragePort } from '#application/ports/storage.port.js';
import type { ProfileImage } from '#domain/canonical/profile-image.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import type { ConsolidationService } from '#domain/services/canonical/consolidation.service.js';
import { mergeProvider } from '#domain/services/canonical/merge-provider.js';

export interface DatingPersistenceConfig {
  readonly maxImagesToProcess?: number;
}

const DEFAULT_CONFIG: Required<DatingPersistenceConfig> = {
  maxImagesToProcess: 20,
};

export class DatingPersistenceStrategy implements PersistenceStrategyPort<ScrapedProvider> {
  private readonly log = logger().child({ component: 'DatingPersistenceStrategy' });
  private readonly cfg: Required<DatingPersistenceConfig>;

  constructor(
    private readonly repo: ProviderRepositoryPort,
    private readonly consolidation: ConsolidationService,
    private readonly imageHasher: ImageHasherPort,
    private readonly storage: StoragePort,
    config: DatingPersistenceConfig = {},
  ) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
  }

  async persist(scraped: ScrapedProvider, ctx: PersistContext): Promise<PersistResult> {
    const externalRef = scraped.externalRefs[0];
    if (!externalRef) {
      this.log.error({ source: ctx.source, url: ctx.url }, 'No externalRef — skip persist');
      return { action: 'IGNORE' };
    }

    const phones = scraped.phoneNumber ? [scraped.phoneNumber] : [];

    const candidates = await this.repo.find({
      vertical: scraped.vertical,
      phoneNumber: phones[0],
      externalRef,
    });

    const consolidation = this.consolidation.consolidate({
      phones,
      externalRef,
      candidates,
    });

    this.log.info(
      {
        source: ctx.source,
        action: consolidation.action,
        signals: consolidation.signals.map((s) => s.type),
      },
      'Dating consolidation result',
    );

    const now = new Date().toISOString();
    const processedImages = await this.processImages({
      imageUrls: scraped.photos.map((p) => p.url),
      externalId: externalRef.sourceId,
      source: ctx.source,
      vertical: scraped.vertical,
    });

    const enriched: ScrapedProvider = {
      ...scraped,
      confidence: consolidation.confidence,
      signals: [...consolidation.signals],
      images: processedImages,
      lastScrapedAt: now,
    };

    switch (consolidation.action) {
      case 'CREATE':
        await this.repo.create(enriched);
        this.log.info({ id: enriched.id }, 'Provider created');
        return { action: 'CREATE', entityId: enriched.id };
      case 'MERGE':
      case 'FLAG_FOR_REVIEW':
        if (consolidation.target) {
          const patch: Partial<ScrapedProvider> = {
            phoneNumber: phones[0],
            images: processedImages,
            externalRefs: [externalRef],
            confidence: consolidation.confidence,
            verificationStatus:
              consolidation.action === 'FLAG_FOR_REVIEW'
                ? 'pending_review'
                : consolidation.target.verificationStatus,
            signals: [...consolidation.signals],
            attributes: enriched.attributes,
            metadata: enriched.metadata,
            lastScrapedAt: now,
          };
          const merged = mergeProvider(consolidation.target, patch);
          await this.repo.updateById(merged.id, merged);
          this.log.info({ id: merged.id, action: consolidation.action }, 'Provider updated');
          return { action: consolidation.action, entityId: merged.id };
        }
        return { action: consolidation.action };
      case 'IGNORE':
        this.log.info('Dating extraction ignored');
        return { action: 'IGNORE' };
    }
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
          const response = await fetch(imgUrl);
          const buffer = Buffer.from(await response.arrayBuffer());

          const rawHash = await this.imageHasher.generateHash(buffer);
          const hash = asImageHash(rawHash);

          const existing = await this.repo.find({ vertical, imageHash: hash });
          if (existing.length > 0) {
            const existingImg = existing[0]!.images.find((img) => img.hash === hash);
            if (existingImg) {
              return { hash, storedUrl: existingImg.storedUrl, originalUrl: imgUrl };
            }
          }

          const slug = externalId.replace(/[^a-z0-9]/gi, '_');
          const storedUrl = await this.storage.upload(
            buffer,
            `images/${source}/${slug}/${String(i).padStart(3, '0')}.jpg`,
            'image/jpeg',
          );

          return { hash, storedUrl, originalUrl: imgUrl };
        } catch (error) {
          this.log.error({ imgUrl, error }, 'Error processing image');
          return null;
        }
      }),
    );

    return results.filter((r): r is ProfileImage => r !== null);
  }
}
