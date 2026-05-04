import { describe, expect, it } from 'vitest';

import { isSupportedCountry, SUPPORTED_COUNTRIES } from '@domain/shared/country-code.js';

describe('SUPPORTED_COUNTRIES', () => {
  it('contains ES', () => {
    expect(SUPPORTED_COUNTRIES).toContain('ES');
  });

  it('contains PT', () => {
    expect(SUPPORTED_COUNTRIES).toContain('PT');
  });
});

describe('isSupportedCountry', () => {
  it('returns true for ES', () => {
    expect(isSupportedCountry('ES')).toBe(true);
  });

  it('returns true for PT', () => {
    expect(isSupportedCountry('PT')).toBe(true);
  });

  it('returns false for unsupported country', () => {
    expect(isSupportedCountry('FR')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSupportedCountry('')).toBe(false);
  });

  it('returns false for lowercase', () => {
    expect(isSupportedCountry('es')).toBe(false);
  });
});
