import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';

import { Email, ImageHash, Phone, Price, ProviderId, valueOrUndefined } from '@allcoba/domain';

import type {
  ProviderCriteria,
  ProviderRepositoryPort,
} from '#application/ports/repository.port.js';
import type {
  ScrapedImage,
  ScraperSignal,
  SignalType,
  SocialContact,
} from '#domain/aggregates/scraped-provider.aggregate.js';
import type { ContactPlatform } from '#domain/entities/contact-platform.js';
import type { Vertical } from '#domain/entities/vertical.js';
import { ScrapedProvider } from '#domain/aggregates/scraped-provider.aggregate.js';
import { VerificationStatus } from '#domain/entities/verification-status.js';
import { ConfidenceScore } from '#domain/value-objects/confidence-score.vo.js';
import { ExternalId } from '#domain/value-objects/external-id.vo.js';
import { ScrapedLocation } from '#domain/value-objects/scraped-location.vo.js';

import type { NewScrapedProviderRow, ScrapedProviderRow } from './schema/scraper.schema.js';
import * as schema from './schema/scraper.schema.js';

type AnyProviderTable = (typeof schema.verticalTables)[keyof typeof schema.verticalTables];

export class DrizzleProviderRepository implements ProviderRepositoryPort {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  private getTable(vertical: Vertical): AnyProviderTable {
    const table = schema.verticalTables[vertical];
    if (!table) throw new Error(`No table defined for vertical '${vertical}'`);
    return table;
  }

  async find(criteria: ProviderCriteria): Promise<ScrapedProvider[]> {
    if (!criteria.vertical) {
      throw new Error('vertical is required for find() in isolated-table architecture');
    }
    return this.searchInTable(this.getTable(criteria.vertical), criteria);
  }

  private async searchInTable(
    table: AnyProviderTable,
    criteria: ProviderCriteria,
  ): Promise<ScrapedProvider[]> {
    const filters = [];

    if (criteria.phone) {
      filters.push(sql`${table.phones} @> ${JSON.stringify([criteria.phone.e164])}::jsonb`);
    }

    if (criteria.email) {
      filters.push(eq(table.email, criteria.email.value));
    }

    if (criteria.contact) {
      filters.push(sql`${table.contacts} @> ${JSON.stringify([criteria.contact])}::jsonb`);
    }

    if (criteria.externalId) {
      filters.push(
        sql`${table.externalIds} @> ${JSON.stringify([criteria.externalId.toJSON()])}::jsonb`,
      );
    }

    if (criteria.imageHash) {
      filters.push(
        sql`${table.images} @> ${JSON.stringify([{ hash: criteria.imageHash.toJSON() }])}::jsonb`,
      );
    }

    let query = this.db.select().from(table);

    if (filters.length > 0) {
      // @ts-ignore
      query = query.where(sql.join(filters, sql` AND `));
    }

    const rows = await query.execute();

    return (rows as any[]).map((row) => this.toDomain(row)).filter((p): p is ScrapedProvider => p !== null);
  }

  async findById(id: ProviderId): Promise<ScrapedProvider | null> {
    for (const table of Object.values(schema.verticalTables)) {
      const [row] = await this.db.select().from(table).where(eq(table.id, id.value));
      if (row) return this.toDomain(row);
    }
    return null;
  }

  async create(provider: ScrapedProvider): Promise<void> {
    const table = this.getTable(provider.vertical);
    await this.db.insert(table).values(this.toPersistence(provider));
  }

  async update(id: ProviderId, provider: ScrapedProvider): Promise<void> {
    const table = this.getTable(provider.vertical);
    await this.db.update(table).set(this.toPersistence(provider)).where(eq(table.id, id.value));
  }

  private toDomain(row: ScrapedProviderRow): ScrapedProvider | null {
    const idResult = ProviderId.create(row.id);
    if (!idResult.success) return null;

    const phones: Phone[] = [];
    for (const e164 of row.phones as string[]) {
      // libphonenumber-js can infer the country from E.164 (+) numbers
      const res = Phone.create(e164);
      if (res.success) phones.push(res.value);
    }

    const email = valueOrUndefined(Email.create(row.email));

    const rawContacts = row.contacts as { platform: ContactPlatform; handle: string }[];
    const contacts: SocialContact[] = rawContacts.map((c) => ({
      platform: c.platform,
      handle: c.handle,
    }));

    const rawLocation = row.address as {
      address?: string;
      country?: string;
      city?: string;
      region?: string;
      zone?: string;
      postalCode?: string;
      timezone?: string;
      coordinates?: { lat: number; lng: number };
    } | null;
    const location = valueOrUndefined(rawLocation ? ScrapedLocation.create(rawLocation) : null);

    const rawPrice = row.price as { amount: number; currency: string } | null;
    const price = valueOrUndefined(
      rawPrice ? Price.create(rawPrice.amount, rawPrice.currency) : null,
    );

    const externalIds: ExternalId[] = [];
    for (const e of row.externalIds as { source: string; id: string }[]) {
      const res = ExternalId.create(e.source, e.id);
      if (res.success) externalIds.push(res.value);
    }

    const confidenceResult = ConfidenceScore.create(row.confidenceScore);
    const confidenceScore = confidenceResult.success
      ? confidenceResult.value
      : ConfidenceScore.low();

    const images: ScrapedImage[] = [];
    for (const img of row.images as { storedUrl: string; originalUrl: string; hash: string }[]) {
      const hashResult = ImageHash.create(img.hash);
      if (hashResult.success) {
        images.push({
          storedUrl: img.storedUrl,
          originalUrl: img.originalUrl,
          hash: hashResult.value,
        });
      }
    }

    const signals: ScraperSignal[] = (
      row.signals as {
        type: SignalType;
        sourceKey: string;
        confidence: number;
        metadata: Record<string, unknown>;
        createdAt: string;
      }[]
    ).map((s) => ({
      type: s.type,
      sourceKey: s.sourceKey,
      confidence: s.confidence,
      metadata: s.metadata,
      createdAt: new Date(s.createdAt),
    }));

    return ScrapedProvider.create({
      id: idResult.value,
      displayName: row.displayName ?? undefined,
      phones,
      email,
      contacts,
      location,
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

  private toPersistence(p: ScrapedProvider): NewScrapedProviderRow {
    return {
      id: p.id.value,
      displayName: p.displayName,
      phones: p.phones.map((ph) => ph.toJSON()),
      email: p.email?.value ?? null,
      contacts: p.contacts.map((c) => ({ platform: c.platform, handle: c.handle })),
      address: p.location?.toJSON() ?? null,
      description: p.description,
      price: p.price?.toJSON() ?? null,
      images: p.images.map((img) => ({
        storedUrl: img.storedUrl,
        originalUrl: img.originalUrl,
        hash: img.hash.toJSON(),
      })),
      vertical: p.vertical,
      externalIds: p.externalIds.map((e) => e.toJSON()),
      verificationStatus: p.verificationStatus,
      confidenceScore: p.confidenceScore.value,
      signals: p.signals.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
      attributes: p.attributes,
      metadata: p.metadata,
      lastScrapedAt: p.lastScrapedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
