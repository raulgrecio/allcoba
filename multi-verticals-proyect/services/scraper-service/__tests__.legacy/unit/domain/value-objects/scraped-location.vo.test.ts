import { describe, expect, it } from 'vitest';

import { ScrapedLocation } from '#domain/value-objects/scraped-location.vo.js';

describe('ScrapedLocation', () => {
  describe('create', () => {
    it('accepts valid address and coordinates', () => {
      const result = ScrapedLocation.create({
        address: 'Calle Mayor 1',
        coordinates: { lat: 40.4167, lng: -3.7033 },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.address).toBe('Calle Mayor 1');
        expect(result.value.coordinates).toEqual({ lat: 40.4167, lng: -3.7033 });
      }
    });

    it('accepts city-only (no address text)', () => {
      const result = ScrapedLocation.create({ city: 'Madrid' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.city).toBe('Madrid');
        expect(result.value.address).toBeUndefined();
      }
    });

    it('accepts coordinates-only', () => {
      const result = ScrapedLocation.create({ coordinates: { lat: 40, lng: -3 } });
      expect(result.success).toBe(true);
    });

    it('fails for empty address text', () => {
      const result = ScrapedLocation.create({ address: '' });
      expect(result.success).toBe(false);
    });

    it('fails when all fields are empty', () => {
      const result = ScrapedLocation.create({});
      expect(result.success).toBe(false);
    });

    it('fails for invalid coordinates (lat)', () => {
      const result = ScrapedLocation.create({
        address: 'Calle Mayor 1',
        coordinates: { lat: 100, lng: 0 },
      });
      expect(result.success).toBe(false);
    });

    it('fails for invalid coordinates (lng)', () => {
      const result = ScrapedLocation.create({
        address: 'Calle Mayor 1',
        coordinates: { lat: 0, lng: 200 },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('equals', () => {
    it('equal for same address and city', () => {
      const a = ScrapedLocation.create({ address: 'Calle 1' });
      const b = ScrapedLocation.create({ address: 'Calle 1' });
      expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    });

    it('not equal for different address', () => {
      const a = ScrapedLocation.create({ address: 'Calle 1' });
      const b = ScrapedLocation.create({ address: 'Calle 2' });
      expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
    });
  });

  describe('toString / toJSON', () => {
    it('toString returns address and city joined', () => {
      const result = ScrapedLocation.create({ address: 'Calle Mayor', city: 'Madrid' });
      expect(result.success && result.value.toString()).toBe('Calle Mayor, Madrid');
    });

    it('toJSON returns all populated fields', () => {
      const result = ScrapedLocation.create({
        address: 'Madrid',
        coordinates: { lat: 40, lng: -3 },
      });
      expect(result.success && result.value.toJSON()).toMatchObject({
        address: 'Madrid',
        coordinates: { lat: 40, lng: -3 },
      });
    });
  });
});
