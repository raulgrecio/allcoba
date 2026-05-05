import { z } from 'zod';

import type { ValidationResult } from '../shared/validation-result.js';
import { failOne, ok } from '../shared/validation-result.js';
import { ValueObject } from './value-object.base.js';

const schema = z.string().trim().min(2).max(100);

export class City extends ValueObject {
  private constructor(public readonly value: string) {
    super();
  }

  /**
   * Creates a City from raw data.
   * @param candidate - The city name (min 2, max 100 chars)
   */
  static create(candidate: unknown): ValidationResult<City> {
    const parsed = schema.safeParse(candidate);
    if (!parsed.success) {
      return failOne('CITY_INVALID', 'City must be 2-100 chars', ['city']);
    }
    return ok(new City(parsed.data));
  }

  equals(other: ValueObject): boolean {
    return other instanceof City && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
