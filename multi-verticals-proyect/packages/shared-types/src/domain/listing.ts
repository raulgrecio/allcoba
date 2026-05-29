/**
 * Listing — root aggregate of the canonical general-marketplace domain.
 *
 * Pure: marketplace-level data only. Scraper provenance (`ExternalRef`,
 * `Confidence`, `ScrapedListing`) lives in
 * `services/scraper-service/src/domain/canonical/`.
 *
 * Used for sources where items don't fit a tighter vertical (Profile,
 * Property, Vehicle) — generic second-hand goods, services, etc.
 */

import type { CityRef, GeoPoint } from '../catalog/geo.js';
import type { CurrencyCode, Vertical } from '../primitives/enums.js';
import type { I18nText } from '../primitives/i18n-text.js';
import type { ProviderId } from '../primitives/identity.js';
import type { PhotoCanonical } from './media.js';

export type ListingCondition =
  | 'new'
  | 'as-new'
  | 'very-good'
  | 'good'
  | 'fair'
  | 'damaged'
  | 'unknown';

export type ListingShipping = 'allowed' | 'not-allowed' | 'unknown';

export interface ListingStatistics {
  readonly photoCount: number;
  readonly views?: number;
  readonly favorites?: number;
}

export interface Listing {
  readonly id: ProviderId;
  readonly vertical: Extract<Vertical, 'general'>;

  readonly title: string;
  readonly description?: I18nText;

  readonly priceAmount?: number;
  readonly currency?: CurrencyCode;

  /** Hierarchy of category names from source (e.g. `["Tools", "Garden", "Lawnmower"]`). */
  readonly categoryPath: readonly string[];
  readonly brand?: string;
  readonly model?: string;
  readonly condition?: ListingCondition;
  readonly shipping?: ListingShipping;

  readonly baseCity?: CityRef;
  readonly addressText?: I18nText;
  readonly postalCode?: string;
  readonly coordinates?: GeoPoint;

  readonly photos: readonly PhotoCanonical[];

  readonly statistics?: ListingStatistics;

  /** ISO-8601 UTC. */
  readonly createdAt: string;
  readonly updatedAt: string;
}
