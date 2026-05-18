/**
 * Catalog schema — read-only reference tables shared across services.
 * The scraper resolves raw slugs (e.g. "venezuelan", "brown") to branded
 * catalog ids via TaxonomyResolverPort. These tables are populated by seeds
 * and never written by the scraper.
 *
 * pgSchema('catalog') → fully qualified `catalog.<table>` in all queries,
 * independent of search_path.
 */

import { pgSchema, text, uuid } from 'drizzle-orm/pg-core';

const catalog = pgSchema('catalog');

export const countries = catalog.table('countries', {
  id: uuid('id').primaryKey(),
  /** URL-safe slug — `'spain'`, `'france'`. Unique, invariant. */
  slug: text('slug').notNull().unique(),
  /** ISO 3166-1 alpha-2, uppercase — `'ES'`, `'FR'`. */
  iso2: text('iso2').notNull().unique(),
});

export const cities = catalog.table('cities', {
  id: uuid('id').primaryKey(),
  /** URL-safe slug — `'madrid'`, `'las-rozas-de-madrid'`. */
  slug: text('slug').notNull(),
  countryId: uuid('country_id').notNull(),
});

export const nationalities = catalog.table('nationalities', {
  id: uuid('id').primaryKey(),
  /** `'spanish'`, `'venezuelan'`, `'brazilian'`. */
  slug: text('slug').notNull().unique(),
  /** ISO 3166-1 alpha-2 of primary country, when 1:1. */
  iso2Country: text('iso2_country'),
});

export const ethnics = catalog.table('ethnics', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull().unique(),
});

export const hairs = catalog.table('hairs', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull().unique(),
});

export const eyes = catalog.table('eyes', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull().unique(),
});

export const orientations = catalog.table('orientations', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull().unique(),
});
