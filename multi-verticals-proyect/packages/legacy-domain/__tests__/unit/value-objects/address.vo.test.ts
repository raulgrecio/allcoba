import { describe, expect, it } from 'vitest';

import { Address } from '#value-objects/address.vo.js';

const VALID_ES = {
  street: 'Calle Mayor 1',
  city: 'Madrid',
  postalCode: '28001',
  country: 'ES' as const,
};

describe('Address.create', () => {
  it('creates valid ES address', () => {
    const result = Address.create(VALID_ES);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.street.value).toBe('Calle Mayor 1');
      expect(result.value.city.value).toBe('Madrid');
      expect(result.value.postalCode.value).toBe('28001');
      expect(result.value.country).toBe('ES');
    }
  });

  it('accepts optional coordinates', () => {
    const result = Address.create({
      ...VALID_ES,
      coordinates: { lat: 40.4168, lng: -3.7038 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.coordinates?.lat).toBe(40.4168);
      expect(result.value.coordinates?.lng).toBe(-3.7038);
    }
  });

  it('creates address without coordinates', () => {
    const result = Address.create(VALID_ES);
    if (!result.success) return;
    expect(result.value.coordinates).toBeUndefined();
  });

  it('fails for invalid street', () => {
    const result = Address.create({ ...VALID_ES, street: 'AB' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.some((e) => e.code === 'STREET_INVALID')).toBe(true);
  });

  it('fails for invalid city', () => {
    const result = Address.create({ ...VALID_ES, city: 'A' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.some((e) => e.code === 'CITY_INVALID')).toBe(true);
  });

  it('fails for invalid postal code', () => {
    const result = Address.create({ ...VALID_ES, postalCode: '2800' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.code === 'POSTAL_INVALID_FORMAT')).toBe(true);
    }
  });

  it('aggregates multiple validation errors', () => {
    const result = Address.create({ ...VALID_ES, street: 'AB', city: 'A' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('fails for lat out of range', () => {
    const result = Address.create({
      ...VALID_ES,
      coordinates: { lat: 91, lng: 0 },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]!.code).toBe('COORDINATES_OUT_OF_RANGE');
    }
  });

  it('fails for lng out of range', () => {
    const result = Address.create({
      ...VALID_ES,
      coordinates: { lat: 0, lng: 181 },
    });
    expect(result.success).toBe(false);
  });

  it('accepts boundary coordinates', () => {
    expect(Address.create({ ...VALID_ES, coordinates: { lat: 90, lng: 180 } }).success).toBe(true);
    expect(Address.create({ ...VALID_ES, coordinates: { lat: -90, lng: -180 } }).success).toBe(
      true,
    );
  });
});

describe('Address.formatted', () => {
  it('returns human-readable string', () => {
    const result = Address.create(VALID_ES);
    if (!result.success) return;
    expect(result.value.formatted()).toBe('Calle Mayor 1, 28001 Madrid, ES');
  });
});

describe('Address.equals', () => {
  it('returns true for same data', () => {
    const r1 = Address.create(VALID_ES);
    const r2 = Address.create(VALID_ES);
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(true);
  });

  it('returns false for different street', () => {
    const r1 = Address.create(VALID_ES);
    const r2 = Address.create({ ...VALID_ES, street: 'Calle Menor 2' });
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(false);
  });

  it('ignores coordinates in equality', () => {
    const r1 = Address.create(VALID_ES);
    const r2 = Address.create({ ...VALID_ES, coordinates: { lat: 40, lng: -3 } });
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(true);
  });
});

describe('Address.toJSON', () => {
  it('serializes to plain object', () => {
    const result = Address.create(VALID_ES);
    if (!result.success) return;
    const json = result.value.toJSON();
    expect(json).toEqual({
      street: 'Calle Mayor 1',
      city: 'Madrid',
      postalCode: '28001',
      country: 'ES',
      coordinates: undefined,
    });
  });

  it('includes coordinates when present', () => {
    const coords = { lat: 40.4168, lng: -3.7038 };
    const result = Address.create({ ...VALID_ES, coordinates: coords });
    if (!result.success) return;
    expect(result.value.toJSON().coordinates).toEqual(coords);
  });
});
