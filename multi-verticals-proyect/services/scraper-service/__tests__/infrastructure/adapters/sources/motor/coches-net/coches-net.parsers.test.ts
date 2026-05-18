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
    expect(parseSourceIdFromUrl('https://www.coches.net/foo-bar-12345678-x.aspx')).toBe('12345678'));
});

describe('parseFuelType', () => {
  it('Eléctrico → electric', () => expect(parseFuelType('Eléctrico')).toBe('electric'));
  it('Híbrido → hybrid', () => expect(parseFuelType('Híbrido')).toBe('hybrid'));
  it('Híbrido enchufable → plug-in-hybrid', () =>
    expect(parseFuelType('Híbrido enchufable')).toBe('plug-in-hybrid'));
  it('Diésel → diesel', () => expect(parseFuelType('Diésel')).toBe('diesel'));
  it('Gasolina → petrol', () => expect(parseFuelType('Gasolina')).toBe('petrol'));
  it('GLP → lpg', () => expect(parseFuelType('GLP')).toBe('lpg'));
  it('undefined → undefined', () => expect(parseFuelType(undefined)).toBeUndefined());
});

describe('parseTransmission', () => {
  it('COMMON.TRANSMISSION_AUTOMATIC → automatic', () =>
    expect(parseTransmission('COMMON.TRANSMISSION_AUTOMATIC')).toBe('automatic'));
  it('COMMON.TRANSMISSION_MANUAL → manual', () =>
    expect(parseTransmission('COMMON.TRANSMISSION_MANUAL')).toBe('manual'));
  it('undefined → undefined', () => expect(parseTransmission(undefined)).toBeUndefined());
});

describe('parseColor', () => {
  it('COMMON.COLOR_WHITE → white', () => expect(parseColor('COMMON.COLOR_WHITE')).toBe('white'));
  it('raw value preserved', () => expect(parseColor('rojo')).toBe('rojo'));
  it('undefined → undefined', () => expect(parseColor(undefined)).toBeUndefined());
});

describe('parseEnvironmentalLabel', () => {
  it('0 → 0', () => expect(parseEnvironmentalLabel('0')).toBe('0'));
  it('ECO → ECO', () => expect(parseEnvironmentalLabel('ECO')).toBe('ECO'));
  it('C → C', () => expect(parseEnvironmentalLabel('c')).toBe('C'));
  it('unknown → undefined', () =>
    expect(parseEnvironmentalLabel('Z')).toBeUndefined());
});

describe('parseBodyType', () => {
  it('1 → sedan', () => expect(parseBodyType(1)).toBe('sedan'));
  it('3 → suv', () => expect(parseBodyType(3)).toBe('suv'));
  it('99 → undefined', () => expect(parseBodyType(99)).toBeUndefined());
});

describe('parseCondition', () => {
  it('offerType 2 → km-0', () => expect(parseCondition(2)).toBe('km-0'));
  it('offerType 1 → used', () => expect(parseCondition(1)).toBe('used'));
  it('offerType 3 → new', () => expect(parseCondition(3)).toBe('new'));
  it('km <= 100 fallback → km-0', () => expect(parseCondition(undefined, 1)).toBe('km-0'));
  it('km > 100 fallback → used', () => expect(parseCondition(undefined, 5000)).toBe('used'));
  it('no signal → undefined', () => expect(parseCondition(undefined)).toBeUndefined());
});
