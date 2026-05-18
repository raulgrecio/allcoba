import { describe, expect, it } from 'vitest';

import {
  parseNicknameFromTitle,
  parsePhoneFromUrl,
  parseSourceIdFromUrl,
  slugifyMilpasiones,
} from '#infrastructure/adapters/sources/dating/milpasiones/milpasiones.parsers.js';

const FIXTURE_URL =
  'https://milpasiones.com/anuncio/662583238-carinosa-morbosa-muy-implicada_215990/';

describe('parseSourceIdFromUrl', () => {
  it('extracts id from _id pattern', () => {
    expect(parseSourceIdFromUrl(FIXTURE_URL)).toBe('215990');
  });

  it('works without trailing slash', () => {
    expect(
      parseSourceIdFromUrl('https://milpasiones.com/anuncio/662583238-elena_99999'),
    ).toBe('99999');
  });
});

describe('parsePhoneFromUrl', () => {
  it('extracts phone from /anuncio/{phone}-', () => {
    expect(parsePhoneFromUrl(FIXTURE_URL)).toBe('662583238');
  });

  it('returns undefined for non-anuncio URLs', () => {
    expect(parsePhoneFromUrl('https://milpasiones.com/escorts/madrid/')).toBeUndefined();
  });
});

describe('slugifyMilpasiones', () => {
  it('lowercases and strips accents', () => {
    expect(slugifyMilpasiones('Estepona')).toBe('estepona');
    expect(slugifyMilpasiones('Collado Villalba')).toBe('collado-villalba');
  });

  it('returns undefined for falsy', () => {
    expect(slugifyMilpasiones(null)).toBeUndefined();
    expect(slugifyMilpasiones('')).toBeUndefined();
  });
});

describe('parseNicknameFromTitle', () => {
  it('strips leading phone and takes first word', () => {
    expect(
      parseNicknameFromTitle('662583238 NATALIA CARINOSA MORBOSA EN ESTEPONA'),
    ).toBe('NATALIA');
  });

  it('returns first word when no phone prefix', () => {
    expect(parseNicknameFromTitle('Sofia escort Madrid')).toBe('Sofia');
  });

  it('returns empty string for falsy', () => {
    expect(parseNicknameFromTitle(null)).toBe('');
    expect(parseNicknameFromTitle('')).toBe('');
  });
});
