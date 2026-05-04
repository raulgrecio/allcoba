import type { CountryCode } from '../shared/country-code.js';
import type { ValidationResult } from '../shared/validation-result.js';
import { failOne, ok } from '../shared/validation-result.js';
import { ValueObject } from './value-object.base.js';

type CountryRule = {
  prefix: string;
  nationalLength: number;
  nationalRegex: RegExp;
};

const RULES: Record<CountryCode, CountryRule> = {
  ES: {
    prefix: '34',
    nationalLength: 9,
    nationalRegex: /^[6-9]\d{8}$/,
  },
  PT: {
    prefix: '351',
    nationalLength: 9,
    nationalRegex: /^[29]\d{8}$/,
  },
};

export class Phone extends ValueObject {
  private constructor(
    public readonly e164: string,
    public readonly country: CountryCode,
    public readonly national: string,
  ) {
    super();
  }

  static create(raw: string, country: CountryCode = 'ES'): ValidationResult<Phone> {
    const rule = RULES[country];
    if (!rule) {
      return failOne('PHONE_COUNTRY_UNSUPPORTED', `Country ${country} not supported`, ['phone']);
    }

    const digits = raw.replace(/\D/g, '');
    let national = digits;

    if (
      digits.startsWith(rule.prefix) &&
      digits.length === rule.prefix.length + rule.nationalLength
    ) {
      national = digits.slice(rule.prefix.length);
    }

    if (national.length !== rule.nationalLength || !rule.nationalRegex.test(national)) {
      return failOne('PHONE_INVALID_FORMAT', `Invalid ${country} phone number`, ['phone']);
    }

    return ok(new Phone(`+${rule.prefix}${national}`, country, national));
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
