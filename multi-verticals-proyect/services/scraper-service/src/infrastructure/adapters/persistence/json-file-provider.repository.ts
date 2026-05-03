import fs from 'fs/promises';
import path from 'path';
import { logger } from '@allcoba/kernel';

import type { Provider, ProviderCriteria } from '../../../domain/entities/provider.js';
import type { ProviderRepositoryPort } from '../../../application/ports/repository.port.js';

export class JsonFileProviderRepository implements ProviderRepositoryPort {
  private readonly filePath: string;

  constructor(fileName: string = 'providers.json') {
    this.filePath = path.resolve(process.cwd(), 'storage', fileName);
  }

  private async load(): Promise<Map<string, Provider>> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const content = await fs.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content);
      const map = new Map<string, Provider>();
      for (const p of data) {
        map.set(p.id, p);
      }
      return map;
    } catch (error) {
      return new Map();
    }
  }

  private async save(providers: Map<string, Provider>): Promise<void> {
    const data = Array.from(providers.values());
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  async find(criteria: ProviderCriteria): Promise<Provider[]> {
    const providers = await this.load();
    return Array.from(providers.values()).filter(p => {
      let match = false;
      if (criteria.phone && p.phones.includes(criteria.phone)) match = true;
      if (criteria.telegram && p.telegram === criteria.telegram) match = true;
      if (criteria.externalId && p.externalIds[criteria.externalId.source] === criteria.externalId.id) match = true;
      if (criteria.imageHash && p.images.some(img => img.hash === criteria.imageHash)) match = true;
      if (criteria.vertical && p.vertical === criteria.vertical) match = true;

      return match;
    });
  }

  async findById(id: string): Promise<Provider | null> {
    const providers = await this.load();
    return providers.get(id) || null;
  }

  async create(provider: Provider): Promise<void> {
    const providers = await this.load();
    providers.set(provider.id, provider);
    await this.save(providers);
  }

  async update(provider: Provider): Promise<void> {
    const providers = await this.load();
    providers.set(provider.id, provider);
    await this.save(providers);
  }
}
