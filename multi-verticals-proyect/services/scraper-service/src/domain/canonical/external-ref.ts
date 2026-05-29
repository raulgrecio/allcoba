/**
 * ExternalRef — pointer back to the source record.
 *
 * Scraper-only: the marketplace domain (Profile) does not need to know
 * which scraper or external id produced a given record. This metadata
 * lives here and is attached to `ScrapedProvider`, never to `Profile`.
 */

import type { EntityId } from '@allcoba/shared-types';

export interface ExternalRef {
  /** Source slug — `'topescortbabes' | 'girlsmadrid' | …`. */
  readonly source: string;
  /** ID as given by the source (their internal id). */
  readonly sourceId: string;
  /** URL that originated the extraction (debug + re-fetch). */
  readonly sourceUrl?: string;
  /** Canonical id once resolved. Undefined while pending entity-resolution. */
  readonly canonicalId?: EntityId;
}

export const externalRefKey = (ref: ExternalRef): string => `${ref.source}:${ref.sourceId}`;

export const externalRefEquals = (a: ExternalRef, b: ExternalRef): boolean =>
  a.source === b.source && a.sourceId === b.sourceId;

/**
 * Marker structural type: any canonical scraped entity that carries
 * external references back to its source records. All `Scraped*` types
 * (`ScrapedProvider`, `ScrapedProperty`, `ScrapedVehicle`, `ScrapedListing`)
 * satisfy this — used as a generic constraint for entity-resolution-by-ref.
 */
export interface HasExternalRefs {
  readonly externalRefs: readonly ExternalRef[];
}
