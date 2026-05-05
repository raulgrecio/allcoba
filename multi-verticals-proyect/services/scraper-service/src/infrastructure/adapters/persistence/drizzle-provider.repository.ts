import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';

import { ImageHash, Phone, Price, ProviderId, Telegram } from '@allcoba/domain';

import type {
  ProviderCriteria,
  ProviderRepositoryPort,
} from '#application/ports/repository.port.js';
import type {
  ScrapedImage,
  ScraperSignal,
  SignalType,
} from '#domain/aggregates/scraped-provider.aggregate.js';
import {
  ScrapedProvider,
  VerificationStatus,
} from '#domain/aggregates/scraped-provider.aggregate.js';
import { Vertical } from '#domain/entities/vertical.js';
import { ConfidenceScore } from '#domain/value-objects/confidence-score.vo.js';
import { ExternalId } from '#domain/value-objects/external-id.vo.js';
import { ScrapedAddress } from '#domain/value-objects/scraped-address.vo.js';

import type { ScrapedProviderRow } from './schema/scraper.schema.js';
import * as schema from './schema/scraper.schema.js';

export class DrizzleProviderRepository implements ProviderRepositoryPort {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async find(criteria: ProviderCriteria): Promise<ScrapedProvider[]> {
    const filters = [];

    if (criteria.phone) {
      filters.push(
        sql`${schema.scrapedProviders.phones} @> ${JSON.stringify([criteria.phone.toJSON()])}::jsonb`,
      );
    }

    if (criteria.telegram) {
      filters.push(eq(schema.scrapedProviders.telegram, criteria.telegram.toJSON()));
    }

    if (criteria.externalId) {
      filters.push(
        sql`${schema.scrapedProviders.externalIds} @> ${JSON.stringify([criteria.externalId.toJSON()])}::jsonb`,
      );
    }

    if (criteria.imageHash) {
      // images is an array of objects { hash: string, ... }
      filters.push(
        sql`${schema.scrapedProviders.images} @> ${JSON.stringify([{ hash: criteria.imageHash.toJSON() }])}::jsonb`,
      );
    }

    if (criteria.vertical) {
      filters.push(eq(schema.scrapedProviders.vertical, criteria.vertical));
    }

    if (filters.length === 0) return [];

    const rows = await this.db
      .select()
      .from(schema.scrapedProviders)
      .where(sql.join(filters, sql` AND `));

    return rows.map((row) => this.toDomain(row)).filter((p): p is ScrapedProvider => p !== null);
  }

  async findById(id: ProviderId): Promise<ScrapedProvider | null> {
    const [row] = await this.db
      .select()
      .from(schema.scrapedProviders)
      .where(eq(schema.scrapedProviders.id, id.value));

    if (!row) return null;
    return this.toDomain(row);
  }

  async create(provider: ScrapedProvider): Promise<void> {
    await this.db.insert(schema.scrapedProviders).values(this.toPersistence(provider));
  }

  async update(id: ProviderId, provider: ScrapedProvider): Promise<void> {
    await this.db
      .update(schema.scrapedProviders)
      .set(this.toPersistence(provider))
      .where(eq(schema.scrapedProviders.id, id.value));
  }

  private toDomain(row: ScrapedProviderRow): ScrapedProvider | null {
    const idResult = ProviderId.create(row.id);
    if (!idResult.success) return null;

    const phones: Phone[] = [];
    const rawPhones = row.phones as string[];
    for (const e164 of rawPhones) {
      const res = Phone.create(e164);
      if (res.success) phones.push(res.value);
    }

    const telegramResult = row.telegram ? Telegram.create(row.telegram as string) : null;
    const telegram = telegramResult?.success ? telegramResult.value : undefined;

    const rawAddress = row.address as {
      text: string;
      coordinates?: { lat: number; lng: number };
    } | null;
    const addressResult = rawAddress
      ? ScrapedAddress.create(rawAddress.text, rawAddress.coordinates)
      : null;
    const address = addressResult?.success ? addressResult.value : undefined;

    const rawPrice = row.price as { amount: number; currency: string } | null;
    const priceResult = rawPrice ? Price.create(rawPrice.amount, rawPrice.currency) : null;
    const price = priceResult?.success ? priceResult.value : undefined;

    const externalIds: ExternalId[] = [];
    const rawExternalIds = row.externalIds as { source: string; id: string }[];
    for (const e of rawExternalIds) {
      const res = ExternalId.create(e.source, e.id);
      if (res.success) externalIds.push(res.value);
    }

    const confidenceResult = ConfidenceScore.create(row.confidenceScore as number);
    const confidenceScore = confidenceResult.success
      ? confidenceResult.value
      : ConfidenceScore.low();

    const images: ScrapedImage[] = [];
    const rawImages = row.images as { storedUrl: string; originalUrl: string; hash: string }[];
    for (const img of rawImages) {
      const hashResult = ImageHash.create(img.hash);
      if (hashResult.success) {
        images.push({
          storedUrl: img.storedUrl,
          originalUrl: img.originalUrl,
          hash: hashResult.value,
        });
      }
    }

    const rawSignals = row.signals as any[];
    const signals: ScraperSignal[] = rawSignals.map((s) => ({
      type: s.type as SignalType,
      sourceKey: s.sourceKey,
      confidence: s.confidence,
      metadata: s.metadata,
      createdAt: new Date(s.createdAt),
    }));

    return ScrapedProvider.create({
      id: idResult.value,
      displayName: row.displayName ?? undefined,
      phones,
      telegram,
      address,
      description: row.description ?? undefined,
      price,
      images,
      vertical: row.vertical as Vertical,
      externalIds,
      verificationStatus: row.verificationStatus as VerificationStatus,
      confidenceScore,
      signals,
      attributes: row.attributes as Record<string, unknown>,
      metadata: row.metadata as Record<string, unknown>,
      lastScrapedAt: row.lastScrapedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toPersistence(p: ScrapedProvider): any {
    return {
      id: p.id.value,
      displayName: p.displayName,
      phones: p.phones.map((ph) => ph.toJSON()),
      telegram: p.telegram?.toJSON(),
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
      lastScrapedAt: p.lastScrapedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
