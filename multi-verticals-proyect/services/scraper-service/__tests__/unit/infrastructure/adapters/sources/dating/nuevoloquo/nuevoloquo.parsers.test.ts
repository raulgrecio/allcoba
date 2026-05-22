import { describe, expect, it } from 'vitest';

import {
  parseNuevoloquoAge,
  parseNuevoloquoHeightCm,
  parseNuevoloquoWeightKg,
  parseSourceIdFromUrl,
  slugifyNuevoloquo,
} from '#infrastructure/adapters/sources/dating/nuevoloquo/nuevoloquo.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it.each([
    ['https://nuevoloquo.es/escort/madrid/ana/67890/', '67890'],
    ['https://nuevoloquo.ch/escort/barcelona/sofia/12345/', '12345'],
    ['https://nuevoloquo.es/escort/madrid/ana/67890', '67890'],
  ])('%s → %s', (url, expected) => {
    expect(parseSourceIdFromUrl(url)).toBe(expected);
  });
});

describe('parseNuevoloquoAge', () => {
  it('parses valid age', () => expect(parseNuevoloquoAge('27')).toBe(27));
  it('returns undefined for empty', () => expect(parseNuevoloquoAge(undefined)).toBeUndefined());
  it('returns undefined for NaN', () => expect(parseNuevoloquoAge('none')).toBeUndefined());
});

describe('parseNuevoloquoHeightCm', () => {
  it('parses 165', () => expect(parseNuevoloquoHeightCm('165')).toBe(165));
  it('returns undefined for missing', () =>
    expect(parseNuevoloquoHeightCm(undefined)).toBeUndefined());
});

describe('parseNuevoloquoWeightKg', () => {
  it('parses 55', () => expect(parseNuevoloquoWeightKg('55')).toBe(55));
  it('returns undefined for 0', () => expect(parseNuevoloquoWeightKg('0')).toBeUndefined());
});

describe('slugifyNuevoloquo', () => {
  it.each([
    ['Latina', 'latina'],
    ['Morena', 'morena'],
    ['Color Castaño', 'color-castano'],
    [undefined, undefined],
    ['', undefined],
  ])('%s → %s', (input, expected) => {
    expect(slugifyNuevoloquo(input)).toBe(expected);
  });
});
