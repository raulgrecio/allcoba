import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';

import type { ProviderId, Vertical } from '@allcoba/shared-types';

import type {
  ProviderCriteria,
  ProviderRepositoryPort,
} from '#application/ports/repository.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { externalRefKey } from '#domain/canonical/external-ref.js';

import type { NewScrapedProviderRow, ScrapedProviderRow } from './schema/scraper.schema.js';
import * as schema from './schema/scraper.schema.js';

type AnyProviderTable = (typeof schema.verticalTables)[keyof typeof schema.verticalTables];

export class DrizzleProviderRepository implements ProviderRepositoryPort {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  private getTable(vertical: Vertical): AnyProviderTable {
    const table = schema.verticalTables[vertical as keyof typeof schema.verticalTables];
    if (!table) throw new Error(`No table defined for vertical '${vertical}'`);
    return table;
  }

  async find(criteria: ProviderCriteria): Promise<ScrapedProvider[]> {
    return this.searchInTable(this.getTable(criteria.vertical), criteria);
  }

  private async searchInTable(
    table: AnyProviderTable,
    criteria: ProviderCriteria,
  ): Promise<ScrapedProvider[]> {
    const filters = [eq(table.vertical, criteria.vertical)];

    if (criteria.phoneNumber) {
      filters.push(eq(table.phoneNumber, criteria.phoneNumber));
    }

    if (criteria.email) {
      filters.push(eq(table.email, criteria.email));
    }

    if (criteria.externalRef) {
      filters.push(
        sql`${table.externalRefs} @> ${JSON.stringify([
          { source: criteria.externalRef.source, sourceId: criteria.externalRef.sourceId },
        ])}::jsonb`,
      );
    }

    if (criteria.imageHash) {
      filters.push(sql`${table.imageHashes} @> ${JSON.stringify([criteria.imageHash])}::jsonb`);
    }

    // @ts-ignore — Drizzle's where() typing breaks with dynamically-built filter arrays
    const rows = await this.db
      .select()
      .from(table)
      .where(sql.join(filters, sql` AND `))
      .execute();

    return (rows as ScrapedProviderRow[]).map((row) => this.toDomain(row));
  }

  async findById(id: ProviderId): Promise<ScrapedProvider | null> {
    for (const table of Object.values(schema.verticalTables)) {
      const [row] = await this.db.select().from(table).where(eq(table.id, id));
      if (row) return this.toDomain(row as ScrapedProviderRow);
    }
    return null;
  }

  async findByExternalRef(ref: ExternalRef): Promise<ScrapedProvider | null> {
    for (const table of Object.values(schema.verticalTables)) {
      const [row] = await this.db
        .select()
        .from(table)
        .where(
          sql`${table.externalRefs} @> ${JSON.stringify([
            { source: ref.source, sourceId: ref.sourceId },
          ])}::jsonb`,
        )
        .limit(1);
      if (row) return this.toDomain(row as ScrapedProviderRow);
    }
    return null;
  }

  async create(provider: ScrapedProvider): Promise<void> {
    const table = this.getTable(provider.vertical);
    await this.db.insert(table).values(this.toPersistence(provider));
  }

  async update(ref: ExternalRef, provider: ScrapedProvider): Promise<void> {
    const table = this.getTable(provider.vertical);
    await this.db
      .update(table)
      .set(this.toPersistence(provider))
      .where(
        sql`${table.externalRefs} @> ${JSON.stringify([
          { source: ref.source, sourceId: ref.sourceId },
        ])}::jsonb`,
      );
  }

  async updateById(id: ProviderId, provider: ScrapedProvider): Promise<void> {
    const table = this.getTable(provider.vertical);
    await this.db.update(table).set(this.toPersistence(provider)).where(eq(table.id, id));
  }

  private toDomain(row: ScrapedProviderRow): ScrapedProvider {
    return row.data as ScrapedProvider;
  }

  private toPersistence(p: ScrapedProvider): NewScrapedProviderRow {
    return {
      id: p.id,
      vertical: p.vertical,
      phoneNumber: p.phoneNumber ?? null,
      email: p.email ?? null,
      externalRefs: p.externalRefs.map((r) => ({
        source: r.source,
        sourceId: r.sourceId,
      })),
      imageHashes: p.images.map((img) => img.hash),
      confidence: p.confidence,
      lastScrapedAt: new Date(p.lastScrapedAt),
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
      data: p as unknown as Record<string, unknown>,
    };
  }
}
