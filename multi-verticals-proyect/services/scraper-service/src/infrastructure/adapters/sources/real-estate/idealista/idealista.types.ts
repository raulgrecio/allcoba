import type {
  EnergyRating,
  PropertyListingType,
  PropertyType,
} from '@allcoba/shared-types';

export interface IdealistaPhoto {
  readonly position: number;
  readonly url: string;
}

export interface IdealistaPayload {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly description?: string;
  readonly listingType: PropertyListingType;
  readonly propertyType?: PropertyType;
  readonly priceAmount: number;
  readonly priceMode?: 'total' | 'per-month';

  // Location
  readonly city?: string;
  readonly neighborhood?: string;
  readonly street?: string;

  // Structural
  readonly surfaceM2?: number;
  readonly roomsCount?: number;
  readonly bathroomsCount?: number;
  readonly floor?: string;
  readonly buildYear?: number;

  // Features
  readonly hasElevator?: boolean;
  readonly hasAirConditioning?: boolean;
  readonly hasHeating?: boolean;
  readonly hasParking?: boolean;
  readonly hasFurnished?: boolean;
  readonly hasTerrace?: boolean;
  readonly hasGarden?: boolean;
  readonly hasPool?: boolean;
  readonly hasStorageRoom?: boolean;

  // Energy
  readonly energyConsumptionRating?: EnergyRating;
  readonly energyEmissionsRating?: EnergyRating;

  readonly photos: readonly IdealistaPhoto[];
}
