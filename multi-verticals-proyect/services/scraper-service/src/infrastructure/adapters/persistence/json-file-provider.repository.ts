import fs from 'fs/promises';
import path from 'path';

import type { ProviderId } from '@allcoba/shared-types';
import { logger } from '@allcoba/kernel';

import type {
  ProviderCriteria,
  ProviderRepositoryPort,
} from '#application/ports/repository.port.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { externalRefEquals, type ExternalRef } from '#domain/canonical/external-ref.js';

/**
 * JsonFileProviderRepository — dev/test persistence for ScrapedProvider.
 *
 * ScrapedProvider is already JSON-compatible (no Date objects, no class VOs),
 * so serialization is a direct JSON round-trip. Branded types (ProviderId,
 * PhoneE164, ImageHash, Confidence…) are strings/numbers at runtime; the cast
 * on load is safe as long as the file was written by this same adapter.
 */
export class JsonFileProviderRepository implements ProviderRepositoryPort {
  private readonly filePath: string;
  private readonly log = logger().child({ component: 'JsonFileProviderRepository' });

  constructor({
    fileName = 'providers.json',
    basePath = '__data/storage',
  }: { fileName?: string; basePath?: string } = {}) {
    this.filePath = path.resolve(process.cwd(), basePath, fileName);
  }

  private async load(): Promise<Map<string, ScrapedProvider>> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const content = await fs.readFile(this.filePath, 'utf-8');
      const records: ScrapedProvider[] = JSON.parse(content);
      const map = new Map<string, ScrapedProvider>();
      for (const r of records) map.set(r.id, r);
      return map;
    } catch {
      return new Map();
    }
  }

  private async save(providers: Map<string, ScrapedProvider>): Promise<void> {
    const records = Array.from(providers.values());
    await fs.writeFile(this.filePath, JSON.stringify(records, null, 2));
    this.log.debug({ count: records.length, path: this.filePath }, 'Saved providers');
  }

  async find(criteria: ProviderCriteria): Promise<ScrapedProvider[]> {
    const providers = await this.load();
    return Array.from(providers.values()).filter((p) => {
      if (p.vertical !== criteria.vertical) return false;

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
      if (
        criteria.externalRef &&
        p.externalRefs.some((r) => externalRefEquals(r, criteria.externalRef!))
      ) return true;
      if (criteria.imageHash && p.images.some((img) => img.hash === criteria.imageHash)) return true;
      return false;
    });
  }

  async findById(id: ProviderId): Promise<ScrapedProvider | null> {
    const providers = await this.load();
    return providers.get(id) ?? null;
  }

  async findByExternalRef(ref: ExternalRef): Promise<ScrapedProvider | null> {
    const providers = await this.load();
    for (const p of providers.values()) {
      if (p.externalRefs.some((r) => externalRefEquals(r, ref))) return p;
    }
    return null;
  }

  async create(provider: ScrapedProvider): Promise<void> {
    const providers = await this.load();
    providers.set(provider.id, provider);
    await this.save(providers);
  }

  async update(ref: ExternalRef, provider: ScrapedProvider): Promise<void> {
    const providers = await this.load();
    const existing = Array.from(providers.values()).find((p) =>
      p.externalRefs.some((r) => externalRefEquals(r, ref)),
    );
    if (existing) {
      providers.set(existing.id, provider);
      await this.save(providers);
    }
  }

  async updateById(id: ProviderId, provider: ScrapedProvider): Promise<void> {
    const providers = await this.load();
    if (providers.has(id)) {
      providers.set(id, provider);
      await this.save(providers);
    }
  }
}
