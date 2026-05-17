import { describe, expect, it } from 'vitest';

import { Street } from '#value-objects/street.vo.js';

describe('Street.create', () => {
  it('accepts valid street', () => {
    const result = Street.create('Calle Mayor 1');
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.value).toBe('Calle Mayor 1');
  });

  it('trims whitespace', () => {
    const result = Street.create('  Gran Vía 42  ');
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.value).toBe('Gran Vía 42');
  });

  it('accepts exactly 3 characters', () => {
    expect(Street.create('ABC').success).toBe(true);
  });

  it('accepts exactly 200 characters', () => {
    expect(Street.create('A'.repeat(200)).success).toBe(true);
  });

  it('fails for 2-character string', () => {
    const result = Street.create('AB');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors[0]!.code).toBe('STREET_INVALID');
  });

  it('fails for empty string', () => {
    expect(Street.create('').success).toBe(false);
  });

  it('fails for 201-character string', () => {
    expect(Street.create('A'.repeat(201)).success).toBe(false);
  });
});

describe('Street.equals', () => {
  it('returns true for same value', () => {
    const r1 = Street.create('Calle Mayor 1');
    const r2 = Street.create('Calle Mayor 1');
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(true);
  });

  it('returns false for different value', () => {
    const r1 = Street.create('Calle Mayor 1');
    const r2 = Street.create('Calle Menor 2');
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(false);
  });
});
