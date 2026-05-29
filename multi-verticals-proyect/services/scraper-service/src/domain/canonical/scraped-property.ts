/**
 * ScrapedProperty — Property augmented with scraper-only metadata.
 *
 * Mirrors `ScrapedProvider` for the real-estate vertical.
 *
 *   ScrapedProperty = Property  +  ScraperMeta (subset)
 *
 * Property (pure domain) lives in `@allcoba/shared-types`. The scraper-only
 * extensions live alongside this file.
 */

import type { CityId, Property } from '@allcoba/shared-types';

import type { Confidence } from './confidence.js';
import type { ExternalRef } from './external-ref.js';
import type { ScrapedPhoto } from './scraped-photo.js';

export interface ScrapedPropertyMeta {
  readonly externalRefs: readonly ExternalRef[];
  readonly confidence: Confidence;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly metadata: Readonly<Record<string, unknown>>;
  /** ISO-8601 UTC. */
  readonly lastScrapedAt: string;
}

export interface ScrapedPropertyCityRef {
  readonly id: CityId;
}

/**
 * Decompose to `property` when sending downstream.
 *
 * Overrides:
 *   - photos: ScrapedPhoto[] (source URLs, not yet uploaded to R2)
 *   - baseCity: ScrapedPropertyCityRef (id only)
 */
export type ScrapedProperty = Omit<Property, 'photos' | 'baseCity'> &
  ScrapedPropertyMeta & {
    readonly photos: readonly ScrapedPhoto[];
    readonly baseCity?: ScrapedPropertyCityRef;
  };

export const toProperty = (sp: ScrapedProperty): Property => {
  const {
    externalRefs: _externalRefs,
    confidence: _confidence,
    attributes: _attributes,
    metadata: _metadata,
    lastScrapedAt: _lastScrapedAt,
    ...property
  } = sp;
  return property as unknown as Property;
};
