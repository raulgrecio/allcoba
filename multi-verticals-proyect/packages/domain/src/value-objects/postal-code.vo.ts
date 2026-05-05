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

  static create(raw: string, country: CountryCode): ValidationResult<PostalCode> {
    const rule = RULES[country];
    if (!rule) {
      return failOne('POSTAL_COUNTRY_UNSUPPORTED', `Country ${country} not supported`, [
        'postalCode',
      ]);
    }
    const trimmed = raw.trim();
    if (!rule.test(trimmed)) {
      return failOne('POSTAL_INVALID_FORMAT', `Invalid ${country} postal code`, ['postalCode']);
    }
    return ok(new PostalCode(trimmed, country));
  }

  equals(other: ValueObject): boolean {
    return (
      other instanceof PostalCode &&
      this.value === other.value &&
      this.country === other.country
    );
  }

  toString(): string {
    return this.value;
  }
}
