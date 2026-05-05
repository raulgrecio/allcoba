import type { ProviderId } from '@allcoba/domain';

import type {
  ProviderCriteria,
  ProviderRepositoryPort,
} from '#application/ports/repository.port.js';
import type { ScrapedProvider } from '#domain/aggregates/scraped-provider.aggregate.js';

export class InMemoryProviderRepository implements ProviderRepositoryPort {
  private readonly providers: Map<string, ScrapedProvider> = new Map();

  async find(criteria: ProviderCriteria): Promise<ScrapedProvider[]> {
    return Array.from(this.providers.values()).filter((p) => {
      if (criteria.phone && p.hasPhone(criteria.phone)) return true;
      if (criteria.email && p.email?.equals(criteria.email)) return true;
      if (criteria.contact && p.hasContact(criteria.contact.platform, criteria.contact.handle))
        return true;
      if (criteria.externalId && p.hasExternalId(criteria.externalId)) return true;
      if (criteria.imageHash && p.hasImageHash(criteria.imageHash)) return true;
      if (criteria.vertical && p.vertical === criteria.vertical) return true;
      return false;
    });
  }

  async create(provider: ScrapedProvider): Promise<void> {
    this.providers.set(provider.id.value, provider);
  }

  async update(id: ProviderId, provider: ScrapedProvider): Promise<void> {
    this.providers.set(id.value, provider);
  }

  async findById(id: ProviderId): Promise<ScrapedProvider | null> {
    return this.providers.get(id.value) ?? null;
  }
}
