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
  it('1 \u2192 sale', () => expect(parseListingType(1)).toBe('sale'));
  it('3 \u2192 rent', () => expect(parseListingType(3)).toBe('rent'));
  it('undefined \u2192 sale', () => expect(parseListingType(undefined)).toBe('sale'));
});

describe('parsePriceMode', () => {
  it('rent listing \u2192 per-month', () => expect(parsePriceMode(undefined, 'rent')).toBe('per-month'));
  it('sale + periodicity 0 \u2192 total', () => expect(parsePriceMode(0, 'sale')).toBe('total'));
  it('sale + periodicity > 0 \u2192 per-month', () =>
    expect(parsePriceMode(1, 'sale')).toBe('per-month'));
  it('no args \u2192 total', () => expect(parsePriceMode(undefined, undefined)).toBe('total'));
});

describe('parsePropertyType', () => {
  it('typology FLAT \u2192 flat', () => expect(parsePropertyType(undefined, 'FLAT')).toBe('flat'));
  it('typology HOUSE \u2192 house', () => expect(parsePropertyType(undefined, 'HOUSE')).toBe('house'));
  it('typology STUDIO \u2192 studio', () => expect(parsePropertyType(undefined, 'STUDIO')).toBe('studio'));
  it('typology DUPLEX \u2192 duplex', () => expect(parsePropertyType(undefined, 'DUPLEX')).toBe('duplex'));
  it('typology PENTHOUSE \u2192 penthouse', () =>
    expect(parsePropertyType(undefined, 'PENTHOUSE')).toBe('penthouse'));
  it('typology LOFT \u2192 loft', () => expect(parsePropertyType(undefined, 'LOFT')).toBe('loft'));
  it('typology OFFICE \u2192 office', () => expect(parsePropertyType(undefined, 'OFFICE')).toBe('office'));
  it('typology COMMERCIAL \u2192 commercial', () =>
    expect(parsePropertyType(undefined, 'COMMERCIAL')).toBe('commercial'));
  it('typology LAND \u2192 land', () => expect(parsePropertyType(undefined, 'LAND')).toBe('land'));
  it('propertyTypeId 2 \u2192 flat', () => expect(parsePropertyType(2)).toBe('flat'));
  it('propertyTypeId 3 \u2192 house', () => expect(parsePropertyType(3)).toBe('house'));
  it('propertyTypeId 5 \u2192 penthouse', () => expect(parsePropertyType(5)).toBe('penthouse'));
  it('propertyTypeId 6 \u2192 duplex', () => expect(parsePropertyType(6)).toBe('duplex'));
  it('propertyTypeId 7 \u2192 studio', () => expect(parsePropertyType(7)).toBe('studio'));
  it('propertyTypeId 8 \u2192 loft', () => expect(parsePropertyType(8)).toBe('loft'));
  it('unknown \u2192 undefined', () => expect(parsePropertyType(999, 'XYZ')).toBeUndefined());
});

describe('parseFloor', () => {
  it('1ST_FLOOR \u2192 1\u00aa', () => expect(parseFloor('1ST_FLOOR')).toBe('1\u00aa'));
  it('2ND_FLOOR \u2192 2\u00aa', () => expect(parseFloor('2ND_FLOOR')).toBe('2\u00aa'));
  it('GROUND_FLOOR \u2192 Bajo', () => expect(parseFloor('GROUND_FLOOR')).toBe('Bajo'));
  it('GROUND \u2192 Bajo', () => expect(parseFloor('GROUND')).toBe('Bajo'));
  it('BASEMENT \u2192 S\u00f3tano', () => expect(parseFloor('BASEMENT')).toBe('S\u00f3tano'));
  it('SEMIBASEMENT \u2192 Semi-s\u00f3tano', () => expect(parseFloor('SEMIBASEMENT')).toBe('Semi-s\u00f3tano'));
  it('MEZZANINE \u2192 Entresuelo', () => expect(parseFloor('MEZZANINE')).toBe('Entresuelo'));
  it('PENTHOUSE \u2192 \u00c1tico', () => expect(parseFloor('PENTHOUSE')).toBe('\u00c1tico'));
  it('ATTIC \u2192 \u00c1tico', () => expect(parseFloor('ATTIC')).toBe('\u00c1tico'));
  it('raw unknown value preserved', () => expect(parseFloor('SPECIAL')).toBe('SPECIAL'));
  it('undefined \u2192 undefined', () => expect(parseFloor(undefined)).toBeUndefined());
});

describe('parseEnergyRating', () => {
  it('G \u2192 G', () => expect(parseEnergyRating('G')).toBe('G'));
  it('lowercase a \u2192 A', () => expect(parseEnergyRating('a')).toBe('A'));
  it('invalid Z \u2192 undefined', () => expect(parseEnergyRating('Z')).toBeUndefined());
  it('undefined \u2192 undefined', () => expect(parseEnergyRating(undefined)).toBeUndefined());
});

describe('parseExtraFeatures', () => {
  it('detects ascensor', () =>
    expect(parseExtraFeatures(['Ascensor'])).toEqual({ hasElevator: true }));
  it('detects aire acondicionado + calefacci\u00f3n + amueblado', () =>
    expect(parseExtraFeatures(['Aire acondicionado', 'Calefacci\u00f3n', 'Amueblado'])).toEqual({
      hasAirConditioning: true,
      hasHeating: true,
      hasFurnished: true,
    }));
  it('detects piscina + jard\u00edn', () =>
    expect(parseExtraFeatures(['Piscina', 'Jard\u00edn'])).toEqual({
      hasPool: true,
      hasGarden: true,
    }));
  it('detects parking', () => expect(parseExtraFeatures(['Parking'])).toEqual({ hasParking: true }));
  it('detects terraza', () =>
    expect(parseExtraFeatures(['Terraza'])).toEqual({ hasTerrace: true }));
  it('detects trastero', () =>
    expect(parseExtraFeatures(['Trastero'])).toEqual({ hasStorageRoom: true }));
  it('empty array \u2192 empty object', () => expect(parseExtraFeatures([])).toEqual({}));
});

describe('readBooleanFeature', () => {
  const features = [
    { type: 'ELEVATOR', value: 'YES' },
    { type: 'PARKING', value: 'NO' },
    { type: 'POOL', value: 42 },
  ];
  it('YES \u2192 true', () => expect(readBooleanFeature(features, 'ELEVATOR')).toBe(true));
  it('NO \u2192 false', () => expect(readBooleanFeature(features, 'PARKING')).toBe(false));
  it('non-string value \u2192 undefined', () =>
    expect(readBooleanFeature(features, 'POOL')).toBeUndefined());
  it('missing \u2192 undefined', () => expect(readBooleanFeature(features, 'GARDEN')).toBeUndefined());
});

describe('readStringFeature', () => {
  const features = [{ type: 'TYPOLOGY', value: 'FLAT' }];
  it('returns string value', () => expect(readStringFeature(features, 'TYPOLOGY')).toBe('FLAT'));
  it('missing \u2192 undefined', () => expect(readStringFeature(features, 'XYZ')).toBeUndefined());
});

describe('readLetterFeature', () => {
  const features = [
    { type: 'ENERGY', value: { letter: 'G', value: 999 } },
    { type: 'EMISSIONS', value: null },
    { type: 'LABEL', value: 'not-object' },
  ];
  it('returns letter from object', () => expect(readLetterFeature(features, 'ENERGY')).toBe('G'));
  it('null value \u2192 undefined', () =>
    expect(readLetterFeature(features, 'EMISSIONS')).toBeUndefined());
  it('string value \u2192 undefined', () =>
    expect(readLetterFeature(features, 'LABEL')).toBeUndefined());
  it('missing \u2192 undefined', () =>
    expect(readLetterFeature(features, 'MISSING')).toBeUndefined());
});

describe('cleanLocality', () => {
  it('trims leading space', () => expect(cleanLocality(' Madrid Capital')).toBe('Madrid Capital'));
  it('empty after trim \u2192 undefined', () => expect(cleanLocality('   ')).toBeUndefined());
  it('undefined \u2192 undefined', () => expect(cleanLocality(undefined)).toBeUndefined());
});
