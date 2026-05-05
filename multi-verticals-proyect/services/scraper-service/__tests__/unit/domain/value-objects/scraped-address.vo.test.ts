import { describe, expect, it } from 'vitest';

import { ScrapedAddress } from '#domain/value-objects/scraped-address.vo.js';

describe('ScrapedAddress', () => {
  describe('create', () => {
    it('accepts valid text and coordinates', () => {
      const result = ScrapedAddress.create('Calle Mayor 1', { lat: 40.4167, lng: -3.7033 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.text).toBe('Calle Mayor 1');
        expect(result.value.coordinates).toEqual({ lat: 40.4167, lng: -3.7033 });
      }
    });

    it('fails for empty text', () => {
      const result = ScrapedAddress.create('');
      expect(result.success).toBe(false);
    });

    it('fails for invalid coordinates (lat)', () => {
      const result = ScrapedAddress.create('Calle Mayor 1', { lat: 100, lng: 0 });
      expect(result.success).toBe(false);
    });

    it('fails for invalid coordinates (lng)', () => {
      const result = ScrapedAddress.create('Calle Mayor 1', { lat: 0, lng: 200 });
      expect(result.success).toBe(false);
    });
  });

  describe('equals', () => {
    it('equal for same text', () => {
      const a = ScrapedAddress.create('Calle 1');
      const b = ScrapedAddress.create('Calle 1');
      expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    });

    it('not equal for different text', () => {
      const a = ScrapedAddress.create('Calle 1');
      const b = ScrapedAddress.create('Calle 2');
      expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
    });
  });

  describe('toString / toJSON', () => {
    it('toString returns text', () => {
      const result = ScrapedAddress.create('Madrid');
      expect(result.success && result.value.toString()).toBe('Madrid');
    });

    it('toJSON returns object with text and coordinates', () => {
      const result = ScrapedAddress.create('Madrid', { lat: 40, lng: -3 });
      expect(result.success && result.value.toJSON()).toEqual({
        text: 'Madrid',
        coordinates: { lat: 40, lng: -3 },
      });
    });
  });
});
