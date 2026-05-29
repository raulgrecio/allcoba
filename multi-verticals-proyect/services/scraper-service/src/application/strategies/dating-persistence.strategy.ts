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

import { logger } from '@allcoba/kernel';

import type {
  PersistContext,
  PersistenceStrategyPort,
  PersistResult,
} from '#application/ports/persistence-strategy.port.js';
import type { QueuePort } from '#application/ports/queue.port.js';
import type { ProviderRepositoryPort } from '#application/ports/repository.port.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import type { ConsolidationService } from '#domain/services/canonical/consolidation.service.js';
import { JOB_NAMES } from '#application/ports/queue.port.js';
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
    private readonly queue: QueuePort,
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
    const existingImages =
      consolidation.action === 'CREATE' ? [] : consolidation.target?.images || [];

    const enriched: ScrapedProvider = {
      ...scraped,
      confidence: consolidation.confidence,
      signals: [...consolidation.signals],
      images: existingImages,
      lastScrapedAt: now,
    };

    let result: PersistResult = { action: 'IGNORE' };

    switch (consolidation.action) {
      case 'CREATE':
        await this.repo.create(enriched);
        this.log.info({ id: enriched.id }, 'Provider created');
        result = { action: 'CREATE', entityId: enriched.id };
        break;
      case 'MERGE':
      case 'FLAG_FOR_REVIEW':
        if (consolidation.target) {
          const patch: Partial<ScrapedProvider> = {
            phoneNumber: phones[0],
            images: existingImages,
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
          result = { action: consolidation.action, entityId: merged.id };
        } else {
          result = { action: consolidation.action };
        }
        break;
      case 'IGNORE':
        this.log.info('Dating extraction ignored');
        result = { action: 'IGNORE' };
        break;
    }

    if (result.action !== 'IGNORE' && result.entityId) {
      const imageUrls = scraped.photos.map((p) => p.url);
      if (imageUrls.length > 0) {
        this.log.info(
          { providerId: result.entityId, imageCount: imageUrls.length },
          'Publishing image processing job to background queue',
        );
        await this.queue.publish(JOB_NAMES.PROCESS_PROVIDER_IMAGES, {
          providerId: result.entityId,
          imageUrls,
          source: ctx.source,
          vertical: scraped.vertical,
        });
      }
    }

    return result;
  }
}
