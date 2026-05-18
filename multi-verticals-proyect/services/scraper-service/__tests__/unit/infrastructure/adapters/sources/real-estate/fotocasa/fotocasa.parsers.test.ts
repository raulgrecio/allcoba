import { describe, expect, it } from 'vitest';
import {
  cleanLocality,
  parseEnergyRating,
  parseExtraFeatures,
  parseFloor,
  parseListingType,
  parsePriceMode,
  parsePropertyType,
  parseSourceIdFromUrl,
  readBooleanFeature,
  readLetterFeature,
  readStringFeature,
} from '#infrastructure/adapters/sources/real-estate/fotocasa/fotocasa.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it('extracts numeric id from /d url', () =>
    expect(
      parseSourceIdFromUrl(
        'https://www.fotocasa.es/es/comprar/vivienda/madrid-capital/abc/188764809/d',
      ),
    ).toBe('188764809'));
  it('falls back to last segment when no numeric id', () =>
    expect(parseSourceIdFromUrl('https://www.fotocasa.es/foo/bar')).toBe('bar'));
});

describe('parseListingType', () => {
  it('1 → sale', () => expect(parseListingType(1)).toBe('sale'));
  it('3 → rent', () => expect(parseListingType(3)).toBe('rent'));
  it('undefined → sale', () => expect(parseListingType(undefined)).toBe('sale'));
});

describe('parsePriceMode', () => {
  it('rent listing → per-month', () =>
    expect(parsePriceMode(undefined, 'rent')).toBe('per-month'));
  it('sale + periodicity 0 → total', () => expect(parsePriceMode(0, 'sale')).toBe('total'));
  it('sale + periodicity > 0 → per-month', () =>
    expect(parsePriceMode(1, 'sale')).toBe('per-month'));
});

describe('parsePropertyType', () => {
  it('typology FLAT → flat', () => expect(parsePropertyType(undefined, 'FLAT')).toBe('flat'));
  it('typology HOUSE → house', () =>
    expect(parsePropertyType(undefined, 'HOUSE')).toBe('house'));
  it('propertyTypeId 2 → flat', () => expect(parsePropertyType(2)).toBe('flat'));
  it('propertyTypeId 3 → house', () => expect(parsePropertyType(3)).toBe('house'));
  it('unknown → undefined', () => expect(parsePropertyType(999, 'XYZ')).toBeUndefined());
});

describe('parseFloor', () => {
  it('1ST_FLOOR → 1ª', () => expect(parseFloor('1ST_FLOOR')).toBe('1ª'));
  it('2ND_FLOOR → 2ª', () => expect(parseFloor('2ND_FLOOR')).toBe('2ª'));
  it('GROUND_FLOOR → Bajo', () => expect(parseFloor('GROUND_FLOOR')).toBe('Bajo'));
  it('PENTHOUSE → Ático', () => expect(parseFloor('PENTHOUSE')).toBe('Ático'));
  it('undefined → undefined', () => expect(parseFloor(undefined)).toBeUndefined());
});

describe('parseEnergyRating', () => {
  it('G → G', () => expect(parseEnergyRating('G')).toBe('G'));
  it('lowercase a → A', () => expect(parseEnergyRating('a')).toBe('A'));
  it('invalid Z → undefined', () => expect(parseEnergyRating('Z')).toBeUndefined());
});

describe('parseExtraFeatures', () => {
  it('detects ascensor', () =>
    expect(parseExtraFeatures(['Ascensor'])).toEqual({ hasElevator: true }));
  it('detects aire acondicionado + calefacción + amueblado', () =>
    expect(parseExtraFeatures(['Aire acondicionado', 'Calefacción', 'Amueblado'])).toEqual({
      hasAirConditioning: true,
      hasHeating: true,
      hasFurnished: true,
    }));
  it('detects piscina + jardín', () =>
    expect(parseExtraFeatures(['Piscina', 'Jardín'])).toEqual({
      hasPool: true,
      hasGarden: true,
    }));
  it('empty array → empty object', () => expect(parseExtraFeatures([])).toEqual({}));
});

describe('readBooleanFeature', () => {
  const features = [
    { type: 'ELEVATOR', value: 'YES' },
    { type: 'PARKING', value: 'NO' },
  ];
  it('YES → true', () => expect(readBooleanFeature(features, 'ELEVATOR')).toBe(true));
  it('NO → false', () => expect(readBooleanFeature(features, 'PARKING')).toBe(false));
  it('missing → undefined', () =>
    expect(readBooleanFeature(features, 'POOL')).toBeUndefined());
});

describe('readStringFeature', () => {
  const features = [{ type: 'TYPOLOGY', value: 'FLAT' }];
  it('returns string value', () => expect(readStringFeature(features, 'TYPOLOGY')).toBe('FLAT'));
  it('missing → undefined', () =>
    expect(readStringFeature(features, 'XYZ')).toBeUndefined());
});

describe('readLetterFeature', () => {
  const features = [{ type: 'ENERGY', value: { letter: 'G', value: 999 } }];
  it('returns letter from object', () => expect(readLetterFeature(features, 'ENERGY')).toBe('G'));
  it('missing → undefined', () =>
    expect(readLetterFeature(features, 'EMISSIONS')).toBeUndefined());
});

describe('cleanLocality', () => {
  it('trims leading space', () => expect(cleanLocality(' Madrid Capital')).toBe('Madrid Capital'));
  it('empty after trim → undefined', () => expect(cleanLocality('   ')).toBeUndefined());
  it('undefined → undefined', () => expect(cleanLocality(undefined)).toBeUndefined());
});
