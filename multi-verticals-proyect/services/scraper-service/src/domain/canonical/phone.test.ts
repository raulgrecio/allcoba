import { describe, expect, it } from 'vitest';

import { normalizePhone } from './phone.js';

describe('normalizePhone', () => {
  describe('valid Spanish numbers', () => {
    it('normalizes 9-digit local number with ES default', () => {
      expect(normalizePhone('612345678')).toBe('+34612345678');
    });

    it('normalizes number with spaces', () => {
      expect(normalizePhone('612 345 678')).toBe('+34612345678');
    });

    it('normalizes number with dashes', () => {
      expect(normalizePhone('612-345-678')).toBe('+34612345678');
    });

    it('normalizes number already with +34 prefix', () => {
      expect(normalizePhone('+34 612 345 678')).toBe('+34612345678');
    });

    it('normalizes number with 0034 prefix', () => {
      expect(normalizePhone('0034612345678')).toBe('+34612345678');
    });
  });

  describe('valid international numbers', () => {
    it('normalizes UK number with explicit country', () => {
      const result = normalizePhone('+44 7911 123456', 'GB');
      expect(result).toBe('+447911123456');
    });

    it('normalizes number with explicit non-default country', () => {
      const result = normalizePhone('07911 123456', 'GB');
      expect(result).toBe('+447911123456');
    });
  });

  describe('invalid inputs', () => {
    it('returns null for empty string', () => {
      expect(normalizePhone('')).toBeNull();
    });

    it('returns null for non-string', () => {
      expect(normalizePhone(null)).toBeNull();
      expect(normalizePhone(undefined)).toBeNull();
      expect(normalizePhone(123)).toBeNull();
    });

    it('returns null for garbage string', () => {
      expect(normalizePhone('not-a-phone')).toBeNull();
    });

    it('returns null for too-short number', () => {
      expect(normalizePhone('1234')).toBeNull();
    });

    it('returns null for invalid Spanish number (wrong digit count)', () => {
      expect(normalizePhone('12345678')).toBeNull();
    });
  });

  describe('return type', () => {
    it('returns branded PhoneE164 string', () => {
      const result = normalizePhone('612345678');
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\+\d+$/);
    });
  });
});
