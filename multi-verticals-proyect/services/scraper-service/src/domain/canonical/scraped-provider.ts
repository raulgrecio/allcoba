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

import type { Profile } from '@allcoba/shared-types';

import type { Confidence } from './confidence.js';
import type { ExternalRef } from './external-ref.js';
import type { ProfileImage } from './profile-image.js';
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
 * The full record the scraper-service stores and merges.
 * Decompose to `profile` when sending to other services.
 */
export type ScrapedProvider = Profile & ScraperMeta;

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
  return profile;
};
