import { describe, expect, it } from 'vitest';

import {
  parseBuildYear,
  parseEnergyRatingFromIconClass,
  parseFirstInteger,
  parseFloor,
  parseListingType,
  parsePrice,
  parsePropertyType,
  parseSourceIdFromUrl,
  parseStreetFromTitle,
  parseSubtitle,
} from '#infrastructure/adapters/sources/real-estate/idealista/idealista.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it('extracts numeric id from /inmueble/', () =>
    expect(parseSourceIdFromUrl('https://www.idealista.com/inmueble/110715434/')).toBe(
      '110715434',
    ));
  it('fallback when no /inmueble/', () =>
    expect(parseSourceIdFromUrl('https://www.idealista.com/foo/bar')).toBe('bar'));
});

describe('parseListingType', () => {
  it('"Ático en venta..." → sale', () =>
    expect(parseListingType('Ático en venta en Madrid')).toBe('sale'));
  it('"Piso en alquiler..." → rent', () =>
    expect(parseListingType('Piso en alquiler en Madrid')).toBe('rent'));
});

describe('parsePropertyType', () => {
  it('Ático → penthouse', () => expect(parsePropertyType('Ático en venta')).toBe('penthouse'));
  it('Piso → flat', () => expect(parsePropertyType('Piso en venta')).toBe('flat'));
  it('Casa → house', () => expect(parsePropertyType('Casa en alquiler')).toBe('house'));
  it('Estudio → studio', () => expect(parsePropertyType('Estudio en venta')).toBe('studio'));
  it('Dúplex → duplex', () => expect(parsePropertyType('Dúplex en venta')).toBe('duplex'));
  it('Loft → loft', () => expect(parsePropertyType('Loft en alquiler')).toBe('loft'));
  it('Oficina → office', () => expect(parsePropertyType('Oficina en alquiler')).toBe('office'));
  it('Local → commercial', () => expect(parsePropertyType('Local en venta')).toBe('commercial'));
  it('Terreno → land', () => expect(parsePropertyType('Terreno en venta')).toBe('land'));
});

describe('parsePrice', () => {
  it('"1.400.000 €" → 1400000', () => expect(parsePrice('1.400.000 €')).toBe(1400000));
  it('"950 €/mes" → 950', () => expect(parsePrice('950 €/mes')).toBe(950));
  it('empty → 0', () => expect(parsePrice()).toBe(0));
});

describe('parseFloor', () => {
  it('"Planta 6ª exterior" → "6ª"', () => expect(parseFloor('Planta 6ª exterior')).toBe('6ª'));
  it('"Bajo" → "Bajo"', () => expect(parseFloor('Bajo')).toBe('Bajo'));
  it('"Ático" → "Ático"', () => expect(parseFloor('Ático')).toBe('Ático'));
});

describe('parseBuildYear', () => {
  it('"Construido en 1944" → 1944', () => expect(parseBuildYear('Construido en 1944')).toBe(1944));
  it('no match → undefined', () => expect(parseBuildYear('Reformado en 2010')).toBeUndefined());
});

describe('parseFirstInteger', () => {
  it('"177 m²" / m² → 177', () => expect(parseFirstInteger('177 m²', /(\d+)\s*m²/)).toBe(177));
  it('no match → undefined', () => expect(parseFirstInteger('foo', /(\d+)/)).toBeUndefined());
});

describe('parseEnergyRatingFromIconClass', () => {
  it('icon-energy-c-c → C', () =>
    expect(parseEnergyRatingFromIconClass('icon-energy-c-c')).toBe('C'));
  it('icon-energy-c-a → A', () =>
    expect(parseEnergyRatingFromIconClass('foo icon-energy-c-a bar')).toBe('A'));
  it('no match → undefined', () =>
    expect(parseEnergyRatingFromIconClass('icon-heart')).toBeUndefined());
});

describe('parseStreetFromTitle', () => {
  it('extracts after "en venta en"', () =>
    expect(parseStreetFromTitle('Ático en venta en Calle de Isabel la Católica')).toBe(
      'Calle de Isabel la Católica',
    ));
  it('extracts after "en alquiler en"', () =>
    expect(parseStreetFromTitle('Piso en alquiler en Calle Mayor')).toBe('Calle Mayor'));
});

describe('parseSubtitle', () => {
  it('"Palacio, Madrid" → neighborhood + city', () =>
    expect(parseSubtitle('Palacio, Madrid')).toEqual({
      neighborhood: 'Palacio',
      city: 'Madrid',
    }));
  it('"Madrid" → city only', () => expect(parseSubtitle('Madrid')).toEqual({ city: 'Madrid' }));
  it('empty → {}', () => expect(parseSubtitle()).toEqual({}));
});
