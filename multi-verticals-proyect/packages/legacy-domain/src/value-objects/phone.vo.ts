import type { CountryCode as LibPhoneCountryCode } from 'libphonenumber-js';
import { ParseError, parsePhoneNumberWithError } from 'libphonenumber-js';

import type { CountryCode } from '../shared/country-code.js';
import type { ValidationResult } from '../shared/validation-result.js';
import { failOne, ok } from '../shared/validation-result.js';
import { ValueObject } from './value-object.base.js';

export class Phone extends ValueObject {
  private constructor(
    public readonly e164: string,
    public readonly country: string,
  ) {
    super();
  }

  static create(raw: unknown, defaultCountry: CountryCode = 'ES'): ValidationResult<Phone> {
    if (typeof raw !== 'string' || !raw) {
      return failOne('PHONE_REQUIRED', 'Phone number is required and must be a string', ['phone']);
    }
    try {
      const parsed = parsePhoneNumberWithError(raw, defaultCountry as LibPhoneCountryCode);

      if (!parsed.isValid()) {
        return failOne('PHONE_INVALID', 'Invalid phone number', ['phone']);
      }

      if (!parsed.country) {
        return failOne('PHONE_INVALID', 'Could not determine phone country', ['phone']);
      }

      return ok(new Phone(parsed.number, parsed.country));
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
