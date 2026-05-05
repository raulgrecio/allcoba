import type { CountryCode as LibPhoneCountryCode } from 'libphonenumber-js';
import { ParseError, parsePhoneNumber } from 'libphonenumber-js';

import type { CountryCode } from '../shared/country-code.js';
import { SUPPORTED_COUNTRIES } from '../shared/country-code.js';
import type { ValidationResult } from '../shared/validation-result.js';
import { failOne, ok } from '../shared/validation-result.js';
import { ValueObject } from './value-object.base.js';

export class Phone extends ValueObject {
  private constructor(
    public readonly e164: string,
    public readonly country: CountryCode,
    public readonly national: string,
  ) {
    super();
  }

  static create(raw: string, defaultCountry: CountryCode = 'ES'): ValidationResult<Phone> {
    try {
      const parsed = parsePhoneNumber(raw, defaultCountry as LibPhoneCountryCode);

      if (!parsed.isValid()) {
        return failOne('PHONE_INVALID', 'Invalid phone number', ['phone']);
      }

      const resolvedCountry = parsed.country;
      if (!resolvedCountry || !(SUPPORTED_COUNTRIES as readonly string[]).includes(resolvedCountry)) {
        return failOne('PHONE_COUNTRY_UNSUPPORTED', 'Phone country not supported', ['phone']);
      }

      return ok(new Phone(parsed.number, resolvedCountry as CountryCode, parsed.nationalNumber));
    } catch (e) {
      /* v8 ignore next */
      if (!(e instanceof ParseError)) throw e;
      return failOne('PHONE_INVALID_FORMAT', e.message, ['phone']);
    }
  }

  equals(other: ValueObject): boolean {
    return other instanceof Phone && this.e164 === other.e164;
  }

  toString(): string {
    return this.e164;
  }

  toJSON(): string {
    return this.e164;
  }
}
