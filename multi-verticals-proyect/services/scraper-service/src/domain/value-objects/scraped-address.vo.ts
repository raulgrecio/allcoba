import { z } from 'zod';

import type { Coordinates, ValidationResult } from '@allcoba/domain';
import { failOne, ok, ValueObject } from '@allcoba/domain';

const textSchema = z.string().min(1).max(500);

export class ScrapedAddress extends ValueObject {
  private constructor(
    public readonly text: string,
    public readonly coordinates: Coordinates | undefined,
  ) {
    super();
  }

  /**
   * Creates a ScrapedAddress from input data.
   * @param input - The address string (e.g., from a web scraper)
   * @param coordinates - Optional object with Coordinates type { lat: number, lng: number }
   */
  static create(input: unknown, coordinates?: unknown): ValidationResult<ScrapedAddress> {
    if (typeof input !== 'string' || !input) {
      return failOne('SCRAPED_ADDRESS_REQUIRED', 'Address text is required and must be a string', [
        'address',
      ]);
    }

    const result = textSchema.safeParse(input.trim());
    if (!result.success) {
      return failOne('SCRAPED_ADDRESS_INVALID', 'Address text must be 1–500 characters', [
        'address',
      ]);
    }

    let coords: Coordinates | undefined = undefined;
    if (
      coordinates &&
      typeof coordinates === 'object' &&
      'lat' in coordinates &&
      'lng' in coordinates
    ) {
      const { lat, lng } = coordinates as any;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return failOne('SCRAPED_ADDRESS_COORDS_INVALID', 'Invalid coordinates', [
          'address',
          'coordinates',
        ]);
      }
      coords = { lat, lng };
    }

    return ok(new ScrapedAddress(result.data, coords));
  }

  equals(other: ValueObject): boolean {
    return other instanceof ScrapedAddress && this.text === other.text;
  }

  toString(): string {
    return this.text;
  }

  toJSON(): { text: string; coordinates?: Coordinates } {
    return { text: this.text, coordinates: this.coordinates };
  }
}
