/**
 * DrizzleScrapedEntityRepository<T> — generic Drizzle implementation of
 * ScrapedEntityRepositoryPort<T> bound to a single vertical table.
 *
 * One instance per non-dating vertical (real-estate / motor / general).
 * Dating uses the richer DrizzleProviderRepository (multi-criteria find +
 * find-by-id) which already covers ScrapedEntityRepositoryPort via inheritance.
 *
 * Storage shape: full canonical entity in `data` JSONB; externalRefs are
 * mirrored to the indexed JSONB column for containment queries. Other
 * dating-only indexed columns (phoneNumber, email, imageHashes) are nulled
 * because non-dating entities don't carry them.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

import type { ProviderId, Vertical } from '@allcoba/shared-types';

import type { ScrapedEntityRepositoryPort } from '#application/ports/scraped-entity-repository.port.js';
import type { ExternalRef, HasExternalRefs } from '#domain/canonical/external-ref.js';

import type { NewScrapedProviderRow, ScrapedProviderRow } from './schema/scraper.schema.js';
import * as schema from './schema/scraper.schema.js';

type AnyProviderTable = (typeof schema.verticalTables)[keyof typeof schema.verticalTables];

interface IdentifiableScrapedEntity extends HasExternalRefs {
  readonly id: ProviderId;
  readonly vertical: Vertical;
  readonly confidence?: number;
  readonly lastScrapedAt?: string;
}

export class DrizzleScrapedEntityRepository<
  T extends IdentifiableScrapedEntity,
> implements ScrapedEntityRepositoryPort<T> {
  constructor(
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly table: AnyProviderTable,
  ) {}

  async findByExternalRef(ref: ExternalRef): Promise<T | null> {
    const [row] = await this.db
      .select()
      .from(this.table)
      .where(
        sql`${this.table.externalRefs} @> ${JSON.stringify([
          { source: ref.source, sourceId: ref.sourceId },
        ])}::jsonb`,
      )
      .limit(1);
    return row ? this.toDomain(row as ScrapedProviderRow) : null;
  }

  async create(entity: T): Promise<void> {
    await this.db.insert(this.table).values(this.toPersistence(entity));
  }

  async update(ref: ExternalRef, entity: T): Promise<void> {
    await this.db
      .update(this.table)
      .set(this.toPersistence(entity))
      .where(
        sql`${this.table.externalRefs} @> ${JSON.stringify([
          { source: ref.source, sourceId: ref.sourceId },
        ])}::jsonb`,
      );
  }

  private toDomain(row: ScrapedProviderRow): T {
    return row.data as T;
  }

  private toPersistence(e: T): NewScrapedProviderRow {
    const now = new Date();
    const lastScraped = e.lastScrapedAt ? new Date(e.lastScrapedAt) : now;
    return {
      id: e.id,
      vertical: e.vertical,
      phoneNumber: null,
      email: null,
      externalRefs: e.externalRefs.map((r) => ({
        source: r.source,
        sourceId: r.sourceId,
      })),
      imageHashes: [],
      confidence: e.confidence ?? 0,
      lastScrapedAt: lastScraped,
      createdAt: now,
      updatedAt: now,
      data: e as unknown as Record<string, unknown>,
    };
  }
}
