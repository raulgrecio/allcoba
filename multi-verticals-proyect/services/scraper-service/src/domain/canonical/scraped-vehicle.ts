/**
 * ScrapedVehicle — Vehicle augmented with scraper-only metadata.
 *
 * Mirrors ScrapedProvider / ScrapedProperty for the motor vertical.
 *
 *   ScrapedVehicle = Vehicle  +  ScraperMeta (subset)
 */

import type { CityId, Vehicle } from '@allcoba/shared-types';

import type { Confidence } from './confidence.js';
import type { ExternalRef } from './external-ref.js';
import type { ScrapedPhoto } from './scraped-photo.js';

export interface ScrapedVehicleMeta {
  readonly externalRefs: readonly ExternalRef[];
  readonly confidence: Confidence;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly metadata: Readonly<Record<string, unknown>>;
  /** ISO-8601 UTC. */
  readonly lastScrapedAt: string;
}

export interface ScrapedVehicleCityRef {
  readonly id: CityId;
}

export type ScrapedVehicle = Omit<Vehicle, 'photos' | 'baseCity'> &
  ScrapedVehicleMeta & {
    readonly photos: readonly ScrapedPhoto[];
    readonly baseCity?: ScrapedVehicleCityRef;
  };

export const toVehicle = (sv: ScrapedVehicle): Vehicle => {
  const {
    externalRefs: _externalRefs,
    confidence: _confidence,
    attributes: _attributes,
    metadata: _metadata,
    lastScrapedAt: _lastScrapedAt,
    ...vehicle
  } = sv;
  return vehicle as unknown as Vehicle;
};
