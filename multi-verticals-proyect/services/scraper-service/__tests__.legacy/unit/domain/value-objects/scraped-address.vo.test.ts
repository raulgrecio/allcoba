import { describe, expect, it } from 'vitest';

import { ScrapedAddress } from '#domain/value-objects/scraped-address.vo.js';

describe('ScrapedAddress', () => {
  describe('create — happy path', () => {
    it('accepts valid text without coordinates', () => {
      const result = ScrapedAddress.create('Calle Mayor 1, Madrid');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.text).toBe('Calle Mayor 1, Madrid');
        expect(result.value.coordinates).toBeUndefined();
      }
    });

    it('accepts valid text with valid coordinates', () => {
      const result = ScrapedAddress.create('Calle Mayor 1', { lat: 40.4167, lng: -3.7033 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.text).toBe('Calle Mayor 1');
        expect(result.value.coordinates).toEqual({ lat: 40.4167, lng: -3.7033 });
      }
    });

    it('accepts boundary coordinates (90, 180)', () => {
      const result = ScrapedAddress.create('Somewhere', { lat: 90, lng: 180 });
      expect(result.success).toBe(true);
    });

    it('accepts boundary coordinates (-90, -180)', () => {
      const result = ScrapedAddress.create('Somewhere', { lat: -90, lng: -180 });
      expect(result.success).toBe(true);
    });

    it('trims whitespace from text', () => {
      const result = ScrapedAddress.create('  Calle Mayor  ');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value.text).toBe('Calle Mayor');
    });

    it('ignores coordinates param when not an object with lat/lng', () => {
      const result = ScrapedAddress.create('Calle Mayor', 'not-an-object');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value.coordinates).toBeUndefined();
    });
  });

  describe('create — failures', () => {
    it('fails for non-string input', () => {
      const result = ScrapedAddress.create(42);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors[0]!.code).toBe('SCRAPED_ADDRESS_REQUIRED');
    });

    it('fails for null', () => {
      const result = ScrapedAddress.create(null);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors[0]!.code).toBe('SCRAPED_ADDRESS_REQUIRED');
    });

    it('fails for empty string', () => {
      const result = ScrapedAddress.create('');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors[0]!.code).toBe('SCRAPED_ADDRESS_REQUIRED');
    });

    it('fails for whitespace-only string', () => {
      const result = ScrapedAddress.create('   ');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors[0]!.code).toBe('SCRAPED_ADDRESS_INVALID');
    });

    it('fails for text longer than 500 characters', () => {
      const result = ScrapedAddress.create('a'.repeat(501));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors[0]!.code).toBe('SCRAPED_ADDRESS_INVALID');
    });

    it('fails for lat > 90', () => {
      const result = ScrapedAddress.create('Somewhere', { lat: 91, lng: 0 });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors[0]!.code).toBe('SCRAPED_ADDRESS_COORDS_INVALID');
    });

    it('fails for lat < -90', () => {
      const result = ScrapedAddress.create('Somewhere', { lat: -91, lng: 0 });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors[0]!.code).toBe('SCRAPED_ADDRESS_COORDS_INVALID');
    });

    it('fails for lng > 180', () => {
      const result = ScrapedAddress.create('Somewhere', { lat: 0, lng: 181 });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors[0]!.code).toBe('SCRAPED_ADDRESS_COORDS_INVALID');
    });

    it('fails for lng < -180', () => {
      const result = ScrapedAddress.create('Somewhere', { lat: 0, lng: -181 });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors[0]!.code).toBe('SCRAPED_ADDRESS_COORDS_INVALID');
    });
  });

  describe('equals', () => {
    it('equal for same text', () => {
      const a = ScrapedAddress.create('Calle Mayor 1');
      const b = ScrapedAddress.create('Calle Mayor 1');
      expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    });

    it('not equal for different text', () => {
      const a = ScrapedAddress.create('Calle Mayor 1');
      const b = ScrapedAddress.create('Calle Mayor 2');
      expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
    });

    it('equal regardless of coordinates', () => {
      const a = ScrapedAddress.create('Calle Mayor 1', { lat: 40, lng: -3 });
      const b = ScrapedAddress.create('Calle Mayor 1', { lat: 41, lng: -4 });
      expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    });
  });

  describe('toString', () => {
    it('returns text', () => {
      const result = ScrapedAddress.create('Gran Vía 10, Madrid');
      expect(result.success && result.value.toString()).toBe('Gran Vía 10, Madrid');
    });
  });

  describe('toJSON', () => {
    it('includes coordinates when present', () => {
      const result = ScrapedAddress.create('Calle Mayor', { lat: 40.4, lng: -3.7 });
      expect(result.success && result.value.toJSON()).toEqual({
        text: 'Calle Mayor',
        coordinates: { lat: 40.4, lng: -3.7 },
      });
    });

    it('omits coordinates when absent', () => {
      const result = ScrapedAddress.create('Calle Mayor');
      expect(result.success && result.value.toJSON()).toEqual({
        text: 'Calle Mayor',
        coordinates: undefined,
      });
    });
  });
});
