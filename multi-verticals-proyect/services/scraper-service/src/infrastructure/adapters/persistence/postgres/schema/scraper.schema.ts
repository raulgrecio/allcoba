import { char, jsonb, pgTable, primaryKey, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Scraper persistence schema — canonical design.
 *
 * One table per vertical (vertical isolation for large datasets).
 * Each row stores:
 *   - indexed columns for entity-resolution queries (phone, email, externalRefs)
 *   - `data` JSONB: full canonical ScrapedProvider blob (single source of truth)
 *
 * When adding a new vertical:
 *   1. Add a pgTable entry below.
 *   2. Add to verticalTables map.
 *   3. Run `drizzle-kit generate` + `db:push`.
 */

const providerColumns = {
  id: uuid('id').primaryKey(),
  /** Canonical vertical value — `'dating' | 'motor' | 'real-estate' | 'general'`. */
  vertical: text('vertical').notNull(),
  /** PhoneE164 — indexed for entity-resolution by phone. */
  phoneNumber: text('phone_number'),
  /** Email — indexed for entity-resolution by email. */
  email: text('email'),
  /** ExternalRef[] as JSONB — GIN-indexed for containment queries. */
  externalRefs: jsonb('external_refs').notNull().default([]),
  /** ImageHash[] as text[] flattened to JSONB for containment queries. */
  imageHashes: jsonb('image_hashes').notNull().default([]),
  /** Composite confidence score (0..1). */
  confidence: real('confidence').notNull().default(0),
  /** ISO-8601 UTC — when the scraper last visited this provider. */
  lastScrapedAt: timestamp('last_scraped_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  /** Full canonical ScrapedProvider JSON — the canonical source of truth. */
  data: jsonb('data').notNull(),
};

export const datingProviders = pgTable('scraped_dating', providerColumns);
export const motorProviders = pgTable('scraped_motor', providerColumns);
export const realEstateProviders = pgTable('scraped_real_estate', providerColumns);
export const generalProviders = pgTable('scraped_general', providerColumns);

/** Map from canonical Vertical value to its table. */
export const verticalTables = {
  dating: datingProviders,
  motor: motorProviders,
  'real-estate': realEstateProviders,
  general: generalProviders,
} as const;

export type ScrapedProviderRow = typeof datingProviders.$inferSelect;
export type NewScrapedProviderRow = typeof datingProviders.$inferInsert;

/**
 * Raw payload table — opaque source payload preserved as-is before any
 * mapping to the canonical model. PK is (source, source_id) so a re-scrape
 * overwrites the previous capture. `payload` is JSONB; each adapter knows
 * its own shape.
 */
export const rawPayloads = pgTable(
  'scraped_raw',
  {
    source: text('source').notNull(),
    sourceId: text('source_id').notNull(),
    sourceUrl: text('source_url'),
    payload: jsonb('payload').notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.source, table.sourceId] }),
  }),
);

export type RawPayloadRow = typeof rawPayloads.$inferSelect;
export type NewRawPayloadRow = typeof rawPayloads.$inferInsert;

/**
 * scraped_images — URL-level dedup table.
 * PK is sha256(originalUrl) so a URL is never enqueued twice across runs.
 */
export const scrapedImages = pgTable('scraped_images', {
  urlHash: char('url_hash', { length: 64 }).primaryKey(),
  originalUrl: text('original_url').notNull(),
  providerId: text('provider_id').notNull(),
  vertical: text('vertical').notNull(),
  seenAt: timestamp('seen_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ScrapedImageRow = typeof scrapedImages.$inferSelect;
export type NewScrapedImageRow = typeof scrapedImages.$inferInsert;
