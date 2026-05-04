import { describe, expect, it } from 'vitest';

import { City } from '@domain/value-objects/city.vo.js';

describe('City.create', () => {
  it('accepts valid city', () => {
    const result = City.create('Madrid');
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.value).toBe('Madrid');
  });

  it('trims whitespace', () => {
    const result = City.create('  Barcelona  ');
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.value).toBe('Barcelona');
  });

  it('accepts exactly 2 characters', () => {
    expect(City.create('AB').success).toBe(true);
  });

  it('accepts exactly 100 characters', () => {
    expect(City.create('A'.repeat(100)).success).toBe(true);
  });

  it('fails for 1-character string', () => {
    const result = City.create('A');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors[0]!.code).toBe('CITY_INVALID');
  });

  it('fails for empty string', () => {
    expect(City.create('').success).toBe(false);
  });

  it('fails for 101-character string', () => {
    expect(City.create('A'.repeat(101)).success).toBe(false);
  });
});

describe('City.equals', () => {
  it('returns true for same value', () => {
    const r1 = City.create('Madrid');
    const r2 = City.create('Madrid');
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(true);
  });

  it('returns false for different value', () => {
    const r1 = City.create('Madrid');
    const r2 = City.create('Barcelona');
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(false);
  });

  it('is case-sensitive', () => {
    const r1 = City.create('madrid');
    const r2 = City.create('Madrid');
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(false);
  });
});
