/**
 * ScrapedProvider — Profile augmented with scraper-only metadata.
 *
 * Composition pattern:
 *   ScrapedProvider = Profile  +  ScraperMeta
 *
 * Profile (pure domain) lives in `@allcoba/shared-types`. ScraperMeta lives
 * here. The scraper persists `ScrapedProvider`; downstream services (matching,
 * search, gateway) consume only `Profile`.
 */

import type { CityId, Profile } from '@allcoba/shared-types';

import type { Confidence } from './confidence.js';
import type { ExternalRef } from './external-ref.js';
import type { ProfileImage } from './profile-image.js';
import type { ScrapedPhoto } from './scraped-photo.js';
import type { ScraperSignal } from './signals.js';

/**
 * Metadata the scraper accumulates while producing a Profile.
 * Never travels to the marketplace domain.
 */
export interface ScraperMeta {
  /** External refs to source records — keys for entity-resolution. */
  readonly externalRefs: readonly ExternalRef[];

  /** Signals collected during entity-resolution — audit trail. */
  readonly signals: readonly ScraperSignal[];

  /** Composite confidence after merging all signals. */
  readonly confidence: Confidence;

  /** Images after dedup + R2 upload (source ↔ stored mapping). */
  readonly images: readonly ProfileImage[];

  /** Per-vertical or per-source attributes not covered by Profile. */
  readonly attributes: Readonly<Record<string, unknown>>;

  /** Adapter / pipeline metadata (provenance, run id). */
  readonly metadata: Readonly<Record<string, unknown>>;

  /** ISO-8601 UTC — when this provider was last visited by the scraper. */
  readonly lastScrapedAt: string;
}

/**
 * Minimal city reference valid at scrape time (only id is available).
 * Downstream services receive a full CityRef after catalog enrichment.
 */
export interface ScrapedCityRef {
  readonly id: CityId;
}

/**
 * The full record the scraper-service stores and merges.
 * Decompose to `profile` when sending to other services.
 *
 * Overrides:
 *   - photos: ScrapedPhoto[] (source URLs, not yet uploaded to R2)
 *   - baseCity/currentCity: ScrapedCityRef (id only, no slug/countryId yet)
 */
export type ScrapedProvider = Omit<Profile, 'photos' | 'baseCity' | 'currentCity'> &
  ScraperMeta & {
    readonly photos: readonly ScrapedPhoto[];
    readonly baseCity?: ScrapedCityRef;
    readonly currentCity?: ScrapedCityRef;
  };

/**
 * Strip scraper metadata to obtain the pure Profile suitable for emission
 * to downstream services (matching, search, gateway…).
 */
export const toProfile = (sp: ScrapedProvider): Profile => {
  const {
    externalRefs: _externalRefs,
    signals: _signals,
    confidence: _confidence,
    images: _images,
    attributes: _attributes,
    metadata: _metadata,
    lastScrapedAt: _lastScrapedAt,
    ...profile
  } = sp;
  // ScrapedProvider.photos is ScrapedPhoto[] (source URLs, not yet R2-uploaded).
  // Profile.photos expects PhotoCanonical[] (post-R2). Cast is intentional.
  return profile as unknown as Profile;
};
