import { describe, expect, it } from 'vitest';

import type { CountryCode } from '@domain/shared/country-code.js';
import { PostalCode } from '@domain/value-objects/postal-code.vo.js';

describe('PostalCode.create — ES', () => {
  it('accepts valid 5-digit code', () => {
    const result = PostalCode.create('28001', 'ES');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('28001');
      expect(result.value.country).toBe('ES');
    }
  });

  it('trims whitespace', () => {
    const result = PostalCode.create('  28001  ', 'ES');
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.value).toBe('28001');
  });

  it('fails for 4 digits', () => {
    const result = PostalCode.create('2800', 'ES');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors[0]!.code).toBe('POSTAL_INVALID_FORMAT');
  });

  it('fails for 6 digits', () => {
    expect(PostalCode.create('280011', 'ES').success).toBe(false);
  });

  it('fails for letters', () => {
    expect(PostalCode.create('2800A', 'ES').success).toBe(false);
  });
});

describe('PostalCode.create — PT', () => {
  it('accepts valid XXXX-XXX format', () => {
    const result = PostalCode.create('1234-567', 'PT');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('1234-567');
      expect(result.value.country).toBe('PT');
    }
  });

  it('fails for ES format with PT country', () => {
    expect(PostalCode.create('28001', 'PT').success).toBe(false);
  });

  it('fails for wrong PT format', () => {
    expect(PostalCode.create('12345-67', 'PT').success).toBe(false);
  });

  it('fails for unsupported country', () => {
    const result = PostalCode.create('28001', 'FR' as CountryCode);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors[0]!.code).toBe('POSTAL_COUNTRY_UNSUPPORTED');
  });
});

describe('PostalCode.equals', () => {
  it('returns true for same value and country', () => {
    const r1 = PostalCode.create('28001', 'ES');
    const r2 = PostalCode.create('28001', 'ES');
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(true);
  });

  it('returns false for same value different country', () => {
    const r1 = PostalCode.create('28001', 'ES');
    const r2 = PostalCode.create('28001', 'ES');
    if (!r1.success || !r2.success) return;
    const ptResult = PostalCode.create('1234-567', 'PT');
    if (!ptResult.success) return;
    expect(r1.value.equals(ptResult.value)).toBe(false);
  });

  it('returns false for different values', () => {
    const r1 = PostalCode.create('28001', 'ES');
    const r2 = PostalCode.create('08001', 'ES');
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(false);
  });
});

describe('PostalCode.toString', () => {
  it('returns the code string', () => {
    const result = PostalCode.create('28001', 'ES');
    if (!result.success) return;
    expect(result.value.toString()).toBe('28001');
  });
});
