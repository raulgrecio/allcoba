import { describe, expect, it } from 'vitest';

import type { CountryCode } from '@domain/shared/country-code.js';
import { Phone } from '@domain/value-objects/phone.vo.js';

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

  it('accepts number with 34 prefix (no +)', () => {
    const result = Phone.create('34612345678');
    expect(result.success).toBe(true);
  });

  it('strips spaces and dashes', () => {
    const result = Phone.create('612 345 678');
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.national).toBe('612345678');
  });

  it('accepts numbers starting with 7, 8, 9', () => {
    for (const prefix of ['7', '8', '9']) {
      const result = Phone.create(`${prefix}12345678`);
      expect(result.success).toBe(true);
    }
  });

  it('fails for number starting with 5', () => {
    expect(Phone.create('512345678').success).toBe(false);
  });

  it('fails for 8-digit number', () => {
    expect(Phone.create('61234567').success).toBe(false);
  });

  it('fails for empty string', () => {
    const result = Phone.create('');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors[0]!.code).toBe('PHONE_INVALID_FORMAT');
  });

  it('fails for letters', () => {
    expect(Phone.create('ABCDEFGHI').success).toBe(false);
  });

  it('fails for unsupported country', () => {
    const result = Phone.create('612345678', 'FR' as CountryCode);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors[0]!.code).toBe('PHONE_COUNTRY_UNSUPPORTED');
  });
});

describe('Phone.create — PT', () => {
  it('accepts valid PT landline', () => {
    const result = Phone.create('291123456', 'PT');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.e164).toBe('+351291123456');
      expect(result.value.country).toBe('PT');
    }
  });

  it('accepts valid PT mobile', () => {
    const result = Phone.create('962123456', 'PT');
    expect(result.success).toBe(true);
  });

  it('accepts number with +351 prefix', () => {
    const result = Phone.create('+351291123456', 'PT');
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.e164).toBe('+351291123456');
  });

  it('fails for ES number format with PT country', () => {
    expect(Phone.create('612345678', 'PT').success).toBe(false);
  });
});

describe('Phone.equals', () => {
  it('returns true for same e164', () => {
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
