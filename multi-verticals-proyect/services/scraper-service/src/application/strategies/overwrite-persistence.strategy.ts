/**
 * OverwritePersistenceStrategy<T> — simple externalRef-keyed CRUD.
 *
 * Default policy for verticals without manual user data conflicts
 * (Property/Vehicle/Listing). Find by external reference, then create on
 * miss or replace on hit. No merge priority because the scraper is the
 * sole writer for these entities; the latest extraction wins.
 */

import { logger } from '@allcoba/kernel';

import type {
  PersistContext,
  PersistResult,
  PersistenceStrategyPort,
} from '#application/ports/persistence-strategy.port.js';
import type { ScrapedEntityRepositoryPort } from '#application/ports/scraped-entity-repository.port.js';
import type { HasExternalRefs } from '#domain/canonical/external-ref.js';

export class OverwritePersistenceStrategy<T extends HasExternalRefs>
  implements PersistenceStrategyPort<T>
{
  private readonly log = logger().child({ component: 'OverwritePersistenceStrategy' });

  constructor(private readonly repo: ScrapedEntityRepositoryPort<T>) {}

  async persist(scraped: T, ctx: PersistContext): Promise<PersistResult> {
    const ref = scraped.externalRefs[0];
    if (!ref) {
      this.log.error({ source: ctx.source, url: ctx.url }, 'No externalRef — skip persist');
      return { action: 'IGNORE' };
    }
    const existing = await this.repo.findByExternalRef(ref);
    if (existing) {
      await this.repo.update(ref, scraped);
      this.log.info(
        { source: ctx.source, sourceId: ref.sourceId },
        'Scraped entity updated',
      );
      return { action: 'UPDATE' };
    }
    await this.repo.create(scraped);
    this.log.info(
      { source: ctx.source, sourceId: ref.sourceId },
      'Scraped entity created',
    );
    return { action: 'CREATE' };
  }
}
