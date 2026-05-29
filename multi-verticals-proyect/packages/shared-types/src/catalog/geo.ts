/**
 * Geo references — minimal identity for cities and countries.
 *
 * Names are localized and live in `entity_translations` keyed by
 * `(entity_type, entity_id, locale)`. The canonical record stores only
 * what is invariant per id: slug, iso2, coordinates, parent country.
 *
 * Source-specific aggregates (e.g. user_count per city in a given site)
 * belong in `scraper_*_stats` tables, not here.
 */

import type { Iso2Code } from '../primitives/enums.js';
import type { CityId, CountryId } from '../primitives/identity.js';

export interface CountryRef {
  readonly id: CountryId;
  readonly iso2: Iso2Code;
  /** URL-safe slug — `'spain'`, `'france'`, `'united-kingdom'`. Invariant. */
  readonly slug: string;
}

export interface CityRef {
  readonly id: CityId;
  /** URL-safe slug — `'paris'`, `'las-rozas-de-madrid'`. Invariant per id. */
  readonly slug: string;
  readonly countryId: CountryId;
  readonly lat?: number;
  readonly lng?: number;
}

/** Lightweight geo point — replaces the legacy `Coordinates` value object. */
export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

export const isValidGeoPoint = (p: GeoPoint): boolean =>
  Number.isFinite(p.lat) &&
  Number.isFinite(p.lng) &&
  p.lat >= -90 &&
  p.lat <= 90 &&
  p.lng >= -180 &&
  p.lng <= 180;

export const cityRefEquals = (a: CityRef, b: CityRef): boolean => a.id === b.id;
export const countryRefEquals = (a: CountryRef, b: CountryRef): boolean => a.id === b.id;
