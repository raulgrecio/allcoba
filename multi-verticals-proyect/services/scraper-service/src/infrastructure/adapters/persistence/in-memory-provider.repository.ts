import type { ProviderRepositoryPort } from '../../../application/ports/repository.port.js';
import type { Provider, ProviderCriteria } from '../../../domain/entities/provider.js';

export class InMemoryProviderRepository implements ProviderRepositoryPort {
  private providers: Map<string, Provider> = new Map();

  async find(criteria: ProviderCriteria): Promise<Provider[]> {
    return Array.from(this.providers.values()).filter(p => {
      if (criteria.phone && p.phones.includes(criteria.phone)) return true;
      if (criteria.telegram && p.telegram === criteria.telegram) return true;
      if (criteria.externalId) {
        const { source, id } = criteria.externalId;
        if (p.externalIds[source] === id) return true;
      }
      return false;
    });
  }

  async save(provider: Provider): Promise<void> {
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
