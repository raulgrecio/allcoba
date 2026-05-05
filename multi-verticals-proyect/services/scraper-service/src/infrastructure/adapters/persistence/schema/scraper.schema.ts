import { jsonb, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const scraperSchema = pgSchema('scraper');

export const scrapedProviders = scraperSchema.table('scraped_providers', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name'),
  phones: jsonb('phones').notNull().default([]),
  telegram: jsonb('telegram'),
  address: jsonb('address'),
  description: text('description'),
  price: jsonb('price'),
  images: jsonb('images').notNull().default([]),
  vertical: text('vertical').notNull(),
  externalIds: jsonb('external_ids').notNull().default([]),
  verificationStatus: text('verification_status').notNull(),
  confidenceScore: jsonb('confidence_score').notNull(),
  signals: jsonb('signals').notNull().default([]),
  attributes: jsonb('attributes').notNull().default({}),
  metadata: jsonb('metadata').notNull().default({}),
  lastScrapedAt: timestamp('last_scraped_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ScrapedProviderRow = typeof scrapedProviders.$inferSelect;
export type NewScrapedProviderRow = typeof scrapedProviders.$inferInsert;
