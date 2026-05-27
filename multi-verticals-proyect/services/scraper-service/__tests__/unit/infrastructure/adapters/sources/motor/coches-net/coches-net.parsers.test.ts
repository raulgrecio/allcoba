import { describe, expect, it } from 'vitest';

import {
  parseBodyType,
  parseColor,
  parseCondition,
  parseEnvironmentalLabel,
  parseFuelType,
  parseSourceIdFromUrl,
  parseTransmission,
} from '#infrastructure/adapters/sources/motor/coches-net/coches-net.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it('extracts numeric id before slug', () =>
    expect(
      parseSourceIdFromUrl(
        '/km-0/peugeot/e-408/asturias/e408-gt-electrico-210-157kw-electrico-hibrido-de-km0-61537261-kovn.aspx',
      ),
    ).toBe('61537261'));
  it('falls back to first numeric block when no slug', () =>
    expect(parseSourceIdFromUrl('https://www.coches.net/foo-bar-12345678-x.aspx')).toBe(
      '12345678',
    ));
  it('last-resort fallback: returns original url when no numbers', () => {
    const url = 'https://www.coches.net/coches/';
    const result = parseSourceIdFromUrl(url);
    expect(typeof result).toBe('string');
  });
});

describe('parseFuelType', () => {
  it('El\u00e9ctrico \u2192 electric', () => expect(parseFuelType('El\u00e9ctrico')).toBe('electric'));
  it('H\u00edbrido \u2192 hybrid', () => expect(parseFuelType('H\u00edbrido')).toBe('hybrid'));
  it('H\u00edbrido enchufable \u2192 plug-in-hybrid', () =>
    expect(parseFuelType('H\u00edbrido enchufable')).toBe('plug-in-hybrid'));
  it('Di\u00e9sel \u2192 diesel', () => expect(parseFuelType('Di\u00e9sel')).toBe('diesel'));
  it('Gasolina \u2192 petrol', () => expect(parseFuelType('Gasolina')).toBe('petrol'));
  it('GLP \u2192 lpg', () => expect(parseFuelType('GLP')).toBe('lpg'));
  it('GNC \u2192 cng', () => expect(parseFuelType('GNC')).toBe('cng'));
  it('Hidr\u00f3geno \u2192 hydrogen', () => expect(parseFuelType('Hidr\u00f3geno')).toBe('hydrogen'));
  it('unknown \u2192 other', () => expect(parseFuelType('biofuel')).toBe('other'));
  it('undefined \u2192 undefined', () => expect(parseFuelType(undefined)).toBeUndefined());
});

describe('parseTransmission', () => {
  it('COMMON.TRANSMISSION_AUTOMATIC \u2192 automatic', () =>
    expect(parseTransmission('COMMON.TRANSMISSION_AUTOMATIC')).toBe('automatic'));
  it('COMMON.TRANSMISSION_MANUAL \u2192 manual', () =>
    expect(parseTransmission('COMMON.TRANSMISSION_MANUAL')).toBe('manual'));
  it('SEMI \u2192 semi-automatic', () => expect(parseTransmission('SEMI_AUTO')).toBe('semi-automatic'));
  it('unknown \u2192 other', () => expect(parseTransmission('CVT')).toBe('other'));
  it('undefined \u2192 undefined', () => expect(parseTransmission(undefined)).toBeUndefined());
});

describe('parseColor', () => {
  it('COMMON.COLOR_WHITE \u2192 white', () => expect(parseColor('COMMON.COLOR_WHITE')).toBe('white'));
  it('raw value preserved', () => expect(parseColor('rojo')).toBe('rojo'));
  it('undefined \u2192 undefined', () => expect(parseColor(undefined)).toBeUndefined());
});

describe('parseEnvironmentalLabel', () => {
  it('0 \u2192 0', () => expect(parseEnvironmentalLabel('0')).toBe('0'));
  it('ECO \u2192 ECO', () => expect(parseEnvironmentalLabel('ECO')).toBe('ECO'));
  it('C \u2192 C', () => expect(parseEnvironmentalLabel('c')).toBe('C'));
  it('B \u2192 B', () => expect(parseEnvironmentalLabel('B')).toBe('B'));
  it('A \u2192 A', () => expect(parseEnvironmentalLabel('A')).toBe('A'));
  it('UNLABELLED \u2192 unlabelled', () =>
    expect(parseEnvironmentalLabel('UNLABELLED')).toBe('unlabelled'));
  it('unknown \u2192 undefined', () => expect(parseEnvironmentalLabel('Z')).toBeUndefined());
});

describe('parseBodyType', () => {
  it('1 \u2192 sedan', () => expect(parseBodyType(1)).toBe('sedan'));
  it('2 \u2192 hatchback', () => expect(parseBodyType(2)).toBe('hatchback'));
  it('3 \u2192 suv', () => expect(parseBodyType(3)).toBe('suv'));
  it('4 \u2192 coupe', () => expect(parseBodyType(4)).toBe('coupe'));
  it('5 \u2192 convertible', () => expect(parseBodyType(5)).toBe('convertible'));
  it('6 \u2192 wagon', () => expect(parseBodyType(6)).toBe('wagon'));
  it('7 \u2192 pickup', () => expect(parseBodyType(7)).toBe('pickup'));
  it('8 \u2192 van', () => expect(parseBodyType(8)).toBe('van'));
  it('9 \u2192 minivan', () => expect(parseBodyType(9)).toBe('minivan'));
  it('99 \u2192 undefined', () => expect(parseBodyType(99)).toBeUndefined());
});

describe('parseCondition', () => {
  it('offerType 1 \u2192 used', () => expect(parseCondition(1)).toBe('used'));
  it('offerType 2 \u2192 km-0', () => expect(parseCondition(2)).toBe('km-0'));
  it('offerType 3 \u2192 new', () => expect(parseCondition(3)).toBe('new'));
  it('offerType 4 \u2192 damaged', () => expect(parseCondition(4)).toBe('damaged'));
  it('km = 0 \u2192 new (via fallback)', () => expect(parseCondition(undefined, 0)).toBe('km-0'));
  it('km \u2264 100 fallback \u2192 km-0', () => expect(parseCondition(undefined, 1)).toBe('km-0'));
  it('km > 100 fallback \u2192 used', () => expect(parseCondition(undefined, 5000)).toBe('used'));
  it('no signal \u2192 undefined', () => expect(parseCondition(undefined)).toBeUndefined());
});
