/**
 * Vehicle — root aggregate of the canonical motor domain.
 *
 * Pure: marketplace-level data only. Scraper provenance (`ExternalRef`,
 * `Confidence`, `ScrapedVehicle`) lives in
 * `services/scraper-service/src/domain/canonical/`.
 *
 * Mirrors Profile / Property: any service may import Vehicle from here;
 * this module never imports from any service.
 */

import type { CityRef, GeoPoint } from '../catalog/geo.js';
import type { CurrencyCode, Vertical } from '../primitives/enums.js';
import type { I18nText } from '../primitives/i18n-text.js';
import type { ProviderId } from '../primitives/identity.js';
import type { PhotoCanonical } from './media.js';

export type VehicleCondition = 'new' | 'km-0' | 'used' | 'damaged';

export type FuelType =
  | 'petrol'
  | 'diesel'
  | 'electric'
  | 'hybrid'
  | 'plug-in-hybrid'
  | 'lpg'
  | 'cng'
  | 'hydrogen'
  | 'other';

export type Transmission = 'manual' | 'automatic' | 'semi-automatic' | 'other';

export type BodyType =
  | 'sedan'
  | 'hatchback'
  | 'suv'
  | 'coupe'
  | 'convertible'
  | 'wagon'
  | 'pickup'
  | 'van'
  | 'minivan'
  | 'other';

export type EnvironmentalLabel = '0' | 'ECO' | 'C' | 'B' | 'A' | 'unlabelled';

export interface VehicleStatistics {
  readonly photoCount: number;
  readonly videoCount: number;
}

export interface Vehicle {
  readonly id: ProviderId;
  readonly vertical: Extract<Vertical, 'motor'>;

  readonly title: string;
  readonly description?: I18nText;

  readonly priceAmount: number;
  readonly currency: CurrencyCode;

  readonly make?: string;
  readonly model?: string;
  readonly version?: string;
  readonly year?: number;
  readonly kilometers?: number;
  readonly fuelType?: FuelType;
  readonly transmission?: Transmission;
  readonly bodyType?: BodyType;
  readonly powerKw?: number;
  readonly powerHp?: number;
  readonly color?: string;
  readonly condition?: VehicleCondition;
  readonly environmentalLabel?: EnvironmentalLabel;

  readonly baseCity?: CityRef;
  readonly addressText?: I18nText;
  readonly coordinates?: GeoPoint;

  readonly photos: readonly PhotoCanonical[];

  readonly statistics?: VehicleStatistics;

  /** ISO-8601 UTC. */
  readonly createdAt: string;
  readonly updatedAt: string;
}
