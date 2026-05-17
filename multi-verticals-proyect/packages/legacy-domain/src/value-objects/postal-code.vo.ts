import type { CountryCode } from '../shared/country-code.js';
import type { ValidationResult } from '../shared/validation-result.js';
import { failOne, ok } from '../shared/validation-result.js';
import { ValueObject } from './value-object.base.js';

const RULES: Record<CountryCode, RegExp> = {
  ES: /^\d{5}$/,
};

export class PostalCode extends ValueObject {
  private constructor(
    public readonly value: string,
    public readonly country: CountryCode,
  ) {
    super();
  }

  /**
   * Creates a PostalCode from candidate data.
   * @param candidate - The postal code value (string)
   * @param country - The country code (2 chars)
   */
  static create(candidate: unknown, country: CountryCode): ValidationResult<PostalCode> {
    if (typeof candidate !== 'string' || !candidate) {
      return failOne('POSTAL_REQUIRED', 'Postal code is required and must be a string', [
        'postalCode',
      ]);
    }

    const rule = RULES[country];
    if (!rule) {
      return failOne('POSTAL_COUNTRY_UNSUPPORTED', `Country ${country} not supported`, [
        'postalCode',
      ]);
    }
    const trimmed = candidate.trim();
    if (!rule.test(trimmed)) {
      return failOne('POSTAL_INVALID_FORMAT', `Invalid ${country} postal code`, ['postalCode']);
    }
    return ok(new PostalCode(trimmed, country));
  }

  equals(other: ValueObject): boolean {
    return (
      other instanceof PostalCode && this.value === other.value && this.country === other.country
    );
  }

  toString(): string {
    return this.value;
  }
}
