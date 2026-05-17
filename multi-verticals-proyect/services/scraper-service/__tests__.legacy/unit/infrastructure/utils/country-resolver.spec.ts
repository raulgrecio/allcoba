import { describe, expect, it } from 'vitest';

import { resolveCountryCode } from '#infrastructure/utils/country-resolver.js';

describe('country-resolver', () => {
  it('should resolve Spanish country names', () => {
    expect(resolveCountryCode('España')).toBe('ES');
  });

  it('should resolve lowercase country names', () => {
    expect(resolveCountryCode('espana')).toBeUndefined();
    expect(resolveCountryCode('spain')).toBe('ES');
  });

  it('should resolve English country names', () => {
    expect(resolveCountryCode('Spain')).toBe('ES');
    expect(resolveCountryCode('United Kingdom')).toBe('GB');
  });

  it('should trim whitespace', () => {
    expect(resolveCountryCode('  España  ')).toBe('ES');
  });

  it('should return undefined for empty string', () => {
    expect(resolveCountryCode('')).toBeUndefined();
    expect(resolveCountryCode('   ')).toBeUndefined();
  });

  it('should return undefined for unknown country', () => {
    expect(resolveCountryCode('UnknownLand')).toBeUndefined();
  });
});
