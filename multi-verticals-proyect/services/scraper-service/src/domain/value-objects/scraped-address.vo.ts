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

  static create(text: string, coordinates?: Coordinates): ValidationResult<ScrapedAddress> {
    const result = textSchema.safeParse(text.trim());
    if (!result.success) {
      return failOne('SCRAPED_ADDRESS_INVALID', 'Address text must be 1–500 characters', [
        'address',
      ]);
    }

    if (coordinates) {
      const { lat, lng } = coordinates;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return failOne('SCRAPED_ADDRESS_COORDS_INVALID', 'Invalid coordinates', [
          'address',
          'coordinates',
        ]);
      }
    }

    return ok(new ScrapedAddress(result.data, coordinates));
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
