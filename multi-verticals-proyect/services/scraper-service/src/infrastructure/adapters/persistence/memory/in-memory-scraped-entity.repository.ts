/**
 * InMemoryScrapedEntityRepository<T> — single generic in-memory implementation
 * of ScrapedEntityRepositoryPort<T>. Keyed by `externalRefKey(ref)` of the
 * first external reference. Used by every vertical whose persistence is
 * externalRef-based overwrite (Property/Vehicle/Listing). Process-lifetime
 * only — for cross-session persistence, swap to a Drizzle implementation.
 */

import type { ScrapedEntityRepositoryPort } from '#application/ports/scraped-entity-repository.port.js';
import type { ExternalRef, HasExternalRefs } from '#domain/canonical/external-ref.js';
import { externalRefEquals, externalRefKey } from '#domain/canonical/external-ref.js';

export class InMemoryScrapedEntityRepository<
  T extends HasExternalRefs,
> implements ScrapedEntityRepositoryPort<T> {
  private readonly items = new Map<string, T>();

  async findByExternalRef(ref: ExternalRef): Promise<T | null> {
    for (const item of this.items.values()) {
      if (item.externalRefs.some((r) => externalRefEquals(r, ref))) return item;
    }
    return null;
  }

  async create(entity: T): Promise<void> {
    const ref = entity.externalRefs[0];
    if (!ref) return;
    this.items.set(externalRefKey(ref), entity);
  }

  async update(ref: ExternalRef, entity: T): Promise<void> {
    this.items.set(externalRefKey(ref), entity);
  }
}
