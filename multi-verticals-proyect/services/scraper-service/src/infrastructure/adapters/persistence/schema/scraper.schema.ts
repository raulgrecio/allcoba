import { jsonb, pgEnum, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { VerificationStatus } from '../../../../domain/entities/verification-status.js';
import { Vertical } from '../../../../domain/entities/vertical.js';

export const verificationStatusEnum = pgEnum('verification_status', [
  VerificationStatus.AUTOMATIC_MATCH,
  VerificationStatus.PENDING_REVIEW,
  VerificationStatus.REJECTED,
  VerificationStatus.VERIFIED_MANUAL,
]);

const providerColumns = {
  id: uuid('id').primaryKey(),
  displayName: text('display_name'),
  phones: jsonb('phones').notNull().default([]),
  email: text('email'),
  contacts: jsonb('contacts').notNull().default([]),
  address: jsonb('address'),
  description: text('description'),
  price: jsonb('price'),
  images: jsonb('images').notNull().default([]),
  vertical: text('vertical').notNull(),
  externalIds: jsonb('external_ids').notNull().default([]),
  verificationStatus: verificationStatusEnum('verification_status').notNull(),
  confidenceScore: real('confidence_score').notNull(),
  signals: jsonb('signals').notNull().default([]),
  attributes: jsonb('attributes').notNull().default({}),
  metadata: jsonb('metadata').notNull().default({}),
  lastScrapedAt: timestamp('last_scraped_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const realEstateProviders = pgTable('scraped_real_estate', providerColumns);
export const motorProviders = pgTable('scraped_motor', providerColumns);
export const jobsProviders = pgTable('scraped_jobs', providerColumns);
export const servicesProviders = pgTable('scraped_services', providerColumns);
export const datingProviders = pgTable('scraped_dating', providerColumns);
export const generalProviders = pgTable('scraped_general', providerColumns);

export const verticalTables = {
  [Vertical.REAL_ESTATE]: realEstateProviders,
  [Vertical.MOTOR]: motorProviders,
  [Vertical.JOBS]: jobsProviders,
  [Vertical.SERVICES]: servicesProviders,
  [Vertical.DATING]: datingProviders,
  [Vertical.GENERAL]: generalProviders,
} as const;

export type ScrapedProviderRow = typeof realEstateProviders.$inferSelect;
export type NewScrapedProviderRow = typeof realEstateProviders.$inferInsert;
