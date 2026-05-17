import { z } from 'zod';

import type { Coordinates, ValidationResult } from '@allcoba/domain';
import { failOne, ok, ValueObject } from '@allcoba/domain';

export interface ScrapedLocationData {
  address?: string;
  country?: string;
  city?: string;
  region?: string;
  zone?: string;
  postalCode?: string;
  timezone?: string;
  coordinates?: { lat: number; lng: number };
}

export class ScrapedLocation extends ValueObject {
  private constructor(
    public readonly address: string | undefined,
    public readonly country: string | undefined,
    public readonly city: string | undefined,
    public readonly region: string | undefined,
    public readonly zone: string | undefined,
    public readonly postalCode: string | undefined,
    public readonly timezone: string | undefined,
    public readonly coordinates: Coordinates | undefined,
  ) {
    super();
  }

  /**
   * Creates a ScrapedLocation from input data.
   * @param input - The data object with optional fields for address, country, city, region, zone, postalCode, timezone, and coordinates.
   */
  static create(input: ScrapedLocationData): ValidationResult<ScrapedLocation> {
    const { address, country, city, region, zone, postalCode, timezone, coordinates } = input;

    if (address !== undefined) {
      const result = z.string().min(1).max(500).safeParse(address.trim());
      if (!result.success) {
        return failOne('SCRAPED_LOCATION_INVALID', 'Address text must be 1–500 characters', [
          'location',
        ]);
      }
    }

    let coords: Coordinates | undefined;
    if (
      coordinates &&
      typeof coordinates === 'object' &&
      'lat' in coordinates &&
      'lng' in coordinates
    ) {
      const { lat, lng } = coordinates as { lat: number; lng: number };
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return failOne('SCRAPED_LOCATION_COORDS_INVALID', 'Invalid coordinates', ['location']);
      }
      coords = { lat, lng };
    }

    const hasContent =
      address?.trim() ||
      country?.trim() ||
      city?.trim() ||
      region?.trim() ||
      zone?.trim() ||
      postalCode?.trim() ||
      timezone?.trim() ||
      coords;

    if (!hasContent) {
      return failOne('SCRAPED_LOCATION_EMPTY', 'At least one location field is required', [
        'location',
      ]);
    }

    return ok(
      new ScrapedLocation(
        address?.trim() || undefined,
        country?.trim() || undefined,
        city?.trim() || undefined,
        region?.trim() || undefined,
        zone?.trim() || undefined,
        postalCode?.trim() || undefined,
        timezone?.trim() || undefined,
        coords,
      ),
    );
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof ScrapedLocation)) return false;
    return this.address === other.address && this.city === other.city;
  }

  toString(): string {
    return [this.address, this.city, this.country].filter(Boolean).join(', ');
  }

  toJSON(): ScrapedLocationData {
    return {
      address: this.address,
      country: this.country,
      city: this.city,
      region: this.region,
      zone: this.zone,
      postalCode: this.postalCode,
      timezone: this.timezone,
      coordinates: this.coordinates,
    };
  }
}
