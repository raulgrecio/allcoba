import fs from 'fs/promises';
import path from 'path';

import type { Coordinates } from '@allcoba/domain';
import { Email, ImageHash, Phone, Price, ProviderId, valueOrUndefined } from '@allcoba/domain';
import { logger } from '@allcoba/kernel';

import type {
  ProviderCriteria,
  ProviderRepositoryPort,
} from '#application/ports/repository.port.js';
import type {
  ContactPlatform,
  ScrapedImage,
  ScraperSignal,
  SignalType,
  SocialContact,
} from '#domain/aggregates/scraped-provider.aggregate.js';
import {
  ScrapedProvider,
  VerificationStatus,
} from '#domain/aggregates/scraped-provider.aggregate.js';
import { Vertical } from '#domain/entities/vertical.js';
import { ConfidenceScore } from '#domain/value-objects/confidence-score.vo.js';
import { ExternalId } from '#domain/value-objects/external-id.vo.js';
import { ScrapedAddress } from '#domain/value-objects/scraped-address.vo.js';

/** Plain JSON shape stored on disk — no VOs, only primitives. */
interface JsonRecord {
  id: string;
  displayName?: string;
  phones: string[];
  email?: string;
  contacts: { platform: string; handle: string }[];
  address?: { text: string; coordinates?: Coordinates };
  description?: string;
  price?: { amount: number; currency: string };
  images: { storedUrl: string; originalUrl: string; hash: string }[];
  vertical: string;
  externalIds: { source: string; id: string }[];
  verificationStatus: string;
  confidenceScore: number;
  signals: {
    type: string;
    sourceKey: string;
    confidence: number;
    metadata: Record<string, unknown>;
    createdAt: string;
  }[];
  attributes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  lastScrapedAt: string;
  createdAt: string;
  updatedAt: string;
}

export class JsonFileProviderRepository implements ProviderRepositoryPort {
  private readonly filePath: string;
  private readonly logger = logger().child({ component: JsonFileProviderRepository.name });

  constructor({
    fileName = 'providers.json',
    basePath = 'storage',
  }: { fileName?: string; basePath?: string } = {}) {
    this.filePath = path.resolve(process.cwd(), basePath, fileName);
  }

  private async load(): Promise<Map<string, ScrapedProvider>> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const content = await fs.readFile(this.filePath, 'utf-8');
      const records: JsonRecord[] = JSON.parse(content);
      const map = new Map<string, ScrapedProvider>();
      for (const r of records) {
        const provider = this.toDomain(r);
        if (provider) map.set(r.id, provider);
      }
      return map;
    } catch {
      return new Map();
    }
  }

  private async save(providers: Map<string, ScrapedProvider>): Promise<void> {
    const records = Array.from(providers.values()).map((p) => this.toRecord(p));
    await fs.writeFile(this.filePath, JSON.stringify(records, null, 2));
  }

  private toDomain(r: JsonRecord): ScrapedProvider | null {
    const idResult = ProviderId.create(r.id);
    if (!idResult.success) return null;

    const phones: Phone[] = [];
    for (const e164 of r.phones) {
      const res = Phone.create(e164);
      if (res.success) phones.push(res.value);
    }

    const email = valueOrUndefined(Email.create(r.email));

    const contacts: SocialContact[] = (r.contacts ?? []).map((c) => ({
      platform: c.platform as ContactPlatform,
      handle: c.handle,
    }));

    const address = valueOrUndefined(
      r.address ? ScrapedAddress.create(r.address.text, r.address.coordinates) : null,
    );

    const price = valueOrUndefined(r.price ? Price.create(r.price.amount, r.price.currency) : null);

    const externalIds: ExternalId[] = [];
    for (const e of r.externalIds) {
      const res = ExternalId.create(e.source, e.id);
      if (res.success) externalIds.push(res.value);
    }

    const confidenceResult = ConfidenceScore.create(r.confidenceScore);
    const confidenceScore = confidenceResult.success
      ? confidenceResult.value
      : ConfidenceScore.low();

    const images: ScrapedImage[] = [];
    for (const img of r.images) {
      const hashResult = ImageHash.create(img.hash);
      if (hashResult.success) {
        images.push({
          storedUrl: img.storedUrl,
          originalUrl: img.originalUrl,
          hash: hashResult.value,
        });
      }
    }

    const signals: ScraperSignal[] = r.signals.map((s) => ({
      type: s.type as SignalType,
      sourceKey: s.sourceKey,
      confidence: s.confidence,
      metadata: s.metadata,
      createdAt: new Date(s.createdAt),
    }));

    return ScrapedProvider.create({
      id: idResult.value,
      displayName: r.displayName,
      phones,
      email,
      contacts,
      address,
      description: r.description,
      price,
      images,
      vertical: r.vertical as Vertical,
      externalIds,
      verificationStatus: r.verificationStatus as VerificationStatus,
      confidenceScore,
      signals,
      attributes: r.attributes,
      metadata: r.metadata,
      lastScrapedAt: new Date(r.lastScrapedAt),
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    });
  }

  private toRecord(p: ScrapedProvider): JsonRecord {
    return {
      id: p.id.toJSON(),
      displayName: p.displayName,
      phones: p.phones.map((ph) => ph.toJSON()),
      email: p.email?.value,
      contacts: p.contacts.map((c) => ({ platform: c.platform, handle: c.handle })),
      address: p.address?.toJSON(),
      description: p.description,
      price: p.price?.toJSON(),
      images: p.images.map((img) => ({
        storedUrl: img.storedUrl,
        originalUrl: img.originalUrl,
        hash: img.hash.toJSON(),
      })),
      vertical: p.vertical,
      externalIds: p.externalIds.map((e) => e.toJSON()),
      verificationStatus: p.verificationStatus,
      confidenceScore: p.confidenceScore.toJSON(),
      signals: p.signals.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
      attributes: p.attributes,
      metadata: p.metadata,
      lastScrapedAt: p.lastScrapedAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  async find(criteria: ProviderCriteria): Promise<ScrapedProvider[]> {
    const providers = await this.load();
    return Array.from(providers.values()).filter((p) => {
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

  async findById(id: ProviderId): Promise<ScrapedProvider | null> {
    const providers = await this.load();
    return providers.get(id.value) ?? null;
  }

  async create(provider: ScrapedProvider): Promise<void> {
    const providers = await this.load();
    providers.set(provider.id.value, provider);
    await this.save(providers);
  }

  async update(id: ProviderId, provider: ScrapedProvider): Promise<void> {
    const providers = await this.load();
    if (providers.has(id.value)) {
      providers.set(id.value, provider);
      await this.save(providers);
    }
  }
}
