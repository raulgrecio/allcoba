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

  it('accepts boundary codes', () => {
    expect(PostalCode.create('01000', 'ES').success).toBe(true);
    expect(PostalCode.create('52999', 'ES').success).toBe(true);
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

  it('fails for unsupported country', () => {
    const result = PostalCode.create('28001', 'PT' as CountryCode);
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
