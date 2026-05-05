import { describe, expect, it } from 'vitest';

import { isSupportedCountry, SUPPORTED_COUNTRIES } from '@domain/shared/country-code.js';

describe('SUPPORTED_COUNTRIES', () => {
  it('contains ES', () => {
    expect(SUPPORTED_COUNTRIES).toContain('ES');
  });

  it('does not contain unsupported countries', () => {
    expect(SUPPORTED_COUNTRIES).not.toContain('PT');
    expect(SUPPORTED_COUNTRIES).not.toContain('FR');
  });
});

describe('isSupportedCountry', () => {
  it('returns true for ES', () => {
    expect(isSupportedCountry('ES')).toBe(true);
  });

  it('returns false for PT', () => {
    expect(isSupportedCountry('PT')).toBe(false);
  });

  it('returns false for other countries', () => {
    expect(isSupportedCountry('FR')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSupportedCountry('')).toBe(false);
  });

  it('returns false for lowercase', () => {
    expect(isSupportedCountry('es')).toBe(false);
  });
});
