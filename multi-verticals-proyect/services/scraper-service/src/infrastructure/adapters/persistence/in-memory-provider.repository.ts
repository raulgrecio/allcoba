import type { ProviderId } from '@allcoba/shared-types';

import type {
  ProviderCriteria,
  ProviderRepositoryPort,
} from '#application/ports/repository.port.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { externalRefEquals, type ExternalRef } from '#domain/canonical/external-ref.js';

export class InMemoryProviderRepository implements ProviderRepositoryPort {
  private readonly providers: Map<string, ScrapedProvider> = new Map();

  async find(criteria: ProviderCriteria): Promise<ScrapedProvider[]> {
    return Array.from(this.providers.values()).filter((p) => {
      if (p.vertical !== criteria.vertical) return false;
      // Sin criterios de búsqueda → devuelve todos los de la vertical.
      if (
        !criteria.phoneNumber &&
        !criteria.email &&
        !criteria.externalRef &&
        !criteria.imageHash
      ) {
        return true;
      }
      if (criteria.phoneNumber && p.phoneNumber === criteria.phoneNumber) return true;
      if (criteria.email && p.email === criteria.email) return true;
      if (criteria.externalRef && p.externalRefs.some((r) => externalRefEquals(r, criteria.externalRef!))) return true;
      if (criteria.imageHash && p.images.some((img) => img.hash === criteria.imageHash)) return true;
      return false;
    });
  }

  async findByExternalRef(ref: ExternalRef): Promise<ScrapedProvider | null> {
    for (const p of this.providers.values()) {
      if (p.externalRefs.some((r) => externalRefEquals(r, ref))) return p;
    }
    return null;
  }

  async create(provider: ScrapedProvider): Promise<void> {
    this.providers.set(provider.id, provider);
  }

  async update(ref: ExternalRef, provider: ScrapedProvider): Promise<void> {
    const existing = await this.findByExternalRef(ref);
    if (existing) this.providers.set(existing.id, provider);
  }

  async updateById(id: ProviderId, provider: ScrapedProvider): Promise<void> {
    this.providers.set(id, provider);
  }

  async findById(id: ProviderId): Promise<ScrapedProvider | null> {
    return this.providers.get(id) ?? null;
  }
}
