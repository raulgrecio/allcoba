import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, eq } from 'drizzle-orm';

import type {
  RawPayloadCriteria,
  RawPayloadRecord,
  RawPayloadRepositoryPort,
} from '#application/ports/raw-payload.port.js';

import type { NewRawPayloadRow, RawPayloadRow } from './schema/scraper.schema.js';
import * as schema from './schema/scraper.schema.js';
import { rawPayloads } from './schema/scraper.schema.js';

/**
 * DrizzleRawPayloadRepository — PG-backed raw payload store.
 *
 * Upserts on (source, source_id) so a re-scrape overwrites the previous
 * capture. `payload` is opaque JSONB; the adapter casts on read.
 */
export class DrizzleRawPayloadRepository implements RawPayloadRepositoryPort {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  private toDomain(row: RawPayloadRow): RawPayloadRecord {
    return {
      source: row.source,
      sourceId: row.sourceId,
      sourceUrl: row.sourceUrl ?? undefined,
      payload: row.payload,
      capturedAt: row.capturedAt.toISOString(),
    };
  }

  async save(record: RawPayloadRecord): Promise<void> {
    const row: NewRawPayloadRow = {
      source: record.source,
      sourceId: record.sourceId,
      sourceUrl: record.sourceUrl ?? null,
      payload: record.payload as unknown,
      capturedAt: new Date(record.capturedAt),
    };
    await this.db
      .insert(rawPayloads)
      .values(row)
      .onConflictDoUpdate({
        target: [rawPayloads.source, rawPayloads.sourceId],
        set: {
          sourceUrl: row.sourceUrl,
          payload: row.payload,
          capturedAt: row.capturedAt,
        },
      })
      .execute();
  }

  async findOne(source: string, sourceId: string): Promise<RawPayloadRecord | null> {
    const rows = await this.db
      .select()
      .from(rawPayloads)
      .where(and(eq(rawPayloads.source, source), eq(rawPayloads.sourceId, sourceId)))
      .limit(1)
      .execute();
    const row = rows[0];
    return row ? this.toDomain(row) : null;
  }

  async find(criteria: RawPayloadCriteria): Promise<RawPayloadRecord[]> {
    const where = criteria.sourceId
      ? and(eq(rawPayloads.source, criteria.source), eq(rawPayloads.sourceId, criteria.sourceId))
      : eq(rawPayloads.source, criteria.source);
    const rows = await this.db.select().from(rawPayloads).where(where).execute();
    return rows.map((r) => this.toDomain(r));
  }

  async *list(source: string): AsyncIterable<RawPayloadRecord> {
    const rows = await this.db
      .select()
      .from(rawPayloads)
      .where(eq(rawPayloads.source, source))
      .execute();
    for (const r of rows) yield this.toDomain(r);
  }
}
