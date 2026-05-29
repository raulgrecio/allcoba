/**
 * ScrapedListing — Listing augmented with scraper-only metadata.
 *
 * Mirrors ScrapedProvider / ScrapedProperty / ScrapedVehicle for the
 * generic vertical.
 *
 *   ScrapedListing = Listing  +  ScraperMeta (subset)
 */

import type { CityId, Listing } from '@allcoba/shared-types';

import type { Confidence } from './confidence.js';
import type { ExternalRef } from './external-ref.js';
import type { ScrapedPhoto } from './scraped-photo.js';

export interface ScrapedListingMeta {
  readonly externalRefs: readonly ExternalRef[];
  readonly confidence: Confidence;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly metadata: Readonly<Record<string, unknown>>;
  /** ISO-8601 UTC. */
  readonly lastScrapedAt: string;
}

export interface ScrapedListingCityRef {
  readonly id: CityId;
}

export type ScrapedListing = Omit<Listing, 'photos' | 'baseCity'> &
  ScrapedListingMeta & {
    readonly photos: readonly ScrapedPhoto[];
    readonly baseCity?: ScrapedListingCityRef;
  };

export const toListing = (sl: ScrapedListing): Listing => {
  const {
    externalRefs: _externalRefs,
    confidence: _confidence,
    attributes: _attributes,
    metadata: _metadata,
    lastScrapedAt: _lastScrapedAt,
    ...listing
  } = sl;
  return listing as unknown as Listing;
};
