import { describe, expect, it } from 'vitest';

import type { CountryCode } from '#shared/country-code.js';
import { Phone } from '#value-objects/phone.vo.js';

describe('Phone.create — ES', () => {
  it('accepts 9-digit mobile number', () => {
    const result = Phone.create('612345678');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.e164).toBe('+34612345678');
      expect(result.value.national).toBe('612345678');
      expect(result.value.country).toBe('ES');
    }
  });

  it('accepts number with +34 prefix', () => {
    const result = Phone.create('+34612345678');
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.e164).toBe('+34612345678');
  });

  it('accepts number with spaces', () => {
    const result = Phone.create('612 345 678', 'ES');
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.national).toBe('612345678');
  });

  it('accepts mobile starting with 7', () => {
    expect(Phone.create('712345678', 'ES').success).toBe(true);
  });

  it('accepts landline starting with 9', () => {
    expect(Phone.create('912345678', 'ES').success).toBe(true);
  });

  it('fails for 8-digit number (too short)', () => {
    expect(Phone.create('61234567', 'ES').success).toBe(false);
  });

  it('fails for empty string', () => {
    const result = Phone.create('', 'ES');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors[0]!.code).toBe('PHONE_REQUIRED');
  });

  it('fails for null or undefined', () => {
    expect(Phone.create(null, 'ES').success).toBe(false);
    expect(Phone.create(undefined, 'ES').success).toBe(false);
  });

  it('fails for letters only', () => {
    expect(Phone.create('ABCDEFGHI', 'ES').success).toBe(false);
  });

  it('fails for number from unsupported country', () => {
    const result = Phone.create('+33612345678', 'ES');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors[0]!.code).toBe('PHONE_COUNTRY_UNSUPPORTED');
  });

  it('fails when defaultCountry bypasses type system', () => {
    const result = Phone.create('612345678', 'PT' as CountryCode);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors[0]!.code).toBe('PHONE_COUNTRY_UNSUPPORTED');
  });
});

describe('Phone.equals', () => {
  it('returns true for same e164 via different input formats', () => {
    const r1 = Phone.create('612345678');
    const r2 = Phone.create('+34612345678');
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(true);
  });

  it('returns false for different numbers', () => {
    const r1 = Phone.create('612345678');
    const r2 = Phone.create('698765432');
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(false);
  });
});

describe('Phone serialization', () => {
  it('toString returns e164', () => {
    const result = Phone.create('612345678');
    if (!result.success) return;
    expect(result.value.toString()).toBe('+34612345678');
  });

  it('toJSON returns e164', () => {
    const result = Phone.create('612345678');
    if (!result.success) return;
    expect(JSON.stringify({ phone: result.value })).toBe('{"phone":"+34612345678"}');
  });
});
