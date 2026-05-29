import type { CountryCode } from 'libphonenumber-js';
import { ParseError, parsePhoneNumberWithError } from 'libphonenumber-js';

import type { PhoneE164 } from '@allcoba/shared-types';

/**
 * Normalizes a raw phone string to E.164 format using the given default country.
 * Returns null if parsing fails or the number is invalid.
 */
export function normalizePhone(raw: unknown, defaultCountry: CountryCode = 'ES'): PhoneE164 | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const parsed = parsePhoneNumberWithError(raw, defaultCountry);
    if (!parsed.isValid() || !parsed.country) return null;
    return parsed.number as unknown as PhoneE164;
  } catch (e) {
    if (!(e instanceof ParseError)) throw e;
    return null;
  }
}
