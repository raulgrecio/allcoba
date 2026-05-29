/**
 * Property — root aggregate of the canonical real-estate domain.
 *
 * Pure: marketplace-level data only. Scraper provenance (`ExternalRef`,
 * `Confidence`, `ScrapedProperty`) lives in
 * `services/scraper-service/src/domain/canonical/`.
 *
 * Direction of dependency mirrors Profile: any service may import Property
 * from here; this module never imports from any service.
 */

import type { CityRef, GeoPoint } from '../catalog/geo.js';
import type { CurrencyCode, Vertical } from '../primitives/enums.js';
import type { I18nText } from '../primitives/i18n-text.js';
import type { ProviderId } from '../primitives/identity.js';
import type { PhotoCanonical } from './media.js';

export type PropertyListingType = 'sale' | 'rent';

export type PropertyType =
  | 'flat'
  | 'house'
  | 'studio'
  | 'duplex'
  | 'penthouse'
  | 'loft'
  | 'office'
  | 'commercial'
  | 'land'
  | 'other';

export type EnergyRating = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface PropertyFeatures {
  readonly hasElevator?: boolean;
  readonly hasAirConditioning?: boolean;
  readonly hasHeating?: boolean;
  readonly hasParking?: boolean;
  readonly hasFurnished?: boolean;
  readonly hasTerrace?: boolean;
  readonly hasGarden?: boolean;
  readonly hasPool?: boolean;
  readonly hasStorageRoom?: boolean;
}

export interface PropertyEnergyCertificate {
  readonly consumptionRating?: EnergyRating;
  readonly emissionsRating?: EnergyRating;
}

export interface PropertyStatistics {
  readonly photoCount: number;
}

export interface Property {
  readonly id: ProviderId;
  readonly vertical: Extract<Vertical, 'real-estate'>;
  readonly listingType: PropertyListingType;
  readonly propertyType?: PropertyType;

  readonly title: string;
  readonly description?: I18nText;

  readonly priceAmount: number;
  readonly currency: CurrencyCode;
  readonly priceMode?: 'total' | 'per-month';

  readonly baseCity?: CityRef;
  readonly addressText?: I18nText;
  readonly postalCode?: string;
  readonly coordinates?: GeoPoint;

  readonly surfaceM2?: number;
  readonly roomsCount?: number;
  readonly bathroomsCount?: number;
  /** Free-form label as captured ("1ª", "Bajo", "Ático"). */
  readonly floor?: string;
  readonly buildYear?: number;

  readonly features: PropertyFeatures;
  readonly energyCertificate?: PropertyEnergyCertificate;

  readonly photos: readonly PhotoCanonical[];

  readonly statistics?: PropertyStatistics;

  /** ISO-8601 UTC. */
  readonly createdAt: string;
  readonly updatedAt: string;
}
