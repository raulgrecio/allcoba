import type { ProviderRepositoryPort } from '../../../application/ports/repository.port.js';
import type { Provider, ProviderCriteria } from '../../../domain/entities/provider.js';

export class InMemoryProviderRepository implements ProviderRepositoryPort {
  private providers: Map<string, Provider> = new Map();

  async find(criteria: ProviderCriteria): Promise<Provider[]> {
    return Array.from(this.providers.values()).filter((p) => {
      let match = false;
      if (criteria.phone && p.phones.includes(criteria.phone)) match = true;
      if (criteria.telegram && p.telegram === criteria.telegram) match = true;
      if (criteria.externalId && criteria.externalId.source && criteria.externalId.id) {
        if (p.externalIds[criteria.externalId.source] === criteria.externalId.id) {
          match = true;
        }
      }
      if (criteria.imageHash && p.images.some((img) => img.hash === criteria.imageHash))
        match = true;

      return match;
    });
  }

  async create(provider: Provider): Promise<void> {
    this.providers.set(provider.id, provider);
  }

  async update(id: string, provider: Partial<Provider>): Promise<void> {
    const existing = this.providers.get(id);
    if (existing) {
      this.providers.set(id, { ...existing, ...provider, updatedAt: new Date() });
    }
  }

  async findById(id: string): Promise<Provider | null> {
    return this.providers.get(id) || null;
  }
}
