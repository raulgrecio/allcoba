import { describe, expect, it } from 'vitest';

import {
  parseBoolAttr,
  parseCitapasionPhone,
  parseCitapasionWhatsapp,
  parseFirstInt,
  parseNicknameFromTitle,
  parseRatingCount,
  parseRatingScore,
  parseSourceIdFromUrl,
} from '#infrastructure/adapters/sources/dating/citapasion/citapasion.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it.each([
    ['https://citapasion.com/escorts/17533', '17533'],
    ['https://citapasion.com/escorts/24080', '24080'],
  ])('%s → %s', (url, expected) => {
    expect(parseSourceIdFromUrl(url)).toBe(expected);
  });
});

describe('parseCitapasionPhone', () => {
  it.each([
    ['tel:+34644556677', '644556677'],
    ['tel:644556677', '644556677'],
    ['tel:34644556677', '644556677'],
    [undefined, undefined],
    ['tel:123', undefined],
  ])('%s → %s', (href, expected) => {
    expect(parseCitapasionPhone(href)).toBe(expected);
  });
});

describe('parseCitapasionWhatsapp', () => {
  it.each([
    ['https://wa.me/34644556677?text=Hola', '644556677'],
    ['https://wa.me/644556677', '644556677'],
    [undefined, undefined],
    ['https://example.com', undefined],
  ])('%s → %s', (href, expected) => {
    expect(parseCitapasionWhatsapp(href)).toBe(expected);
  });
});

describe('parseFirstInt', () => {
  it.each([
    ['28 años', 28],
    ['165 cm', 165],
    ['55 kg', 55],
    [undefined, undefined],
    ['', undefined],
  ])('%s → %s', (text, expected) => {
    expect(parseFirstInt(text)).toBe(expected);
  });
});

describe('parseBoolAttr', () => {
  it.each([
    ['Si', true],
    ['Sí', true],
    ['No', false],
    [undefined, undefined],
    ['Tal vez', undefined],
  ])('%s → %s', (text, expected) => {
    expect(parseBoolAttr(text)).toBe(expected);
  });
});

describe('parseRatingScore', () => {
  it('parses --rating from style', () => {
    expect(parseRatingScore('--rating: 4.5;')).toBe(4.5);
    expect(parseRatingScore('width: 100%; --rating: 3;')).toBe(3);
  });
  it('returns undefined for missing', () => {
    expect(parseRatingScore(undefined)).toBeUndefined();
    expect(parseRatingScore('color: red;')).toBeUndefined();
  });
});

describe('parseRatingCount', () => {
  it('parses (12) from text', () => expect(parseRatingCount('(12)')).toBe(12));
  it('returns 0 for no parens', () => expect(parseRatingCount('123')).toBe(0));
  it('returns undefined for undefined', () => expect(parseRatingCount(undefined)).toBeUndefined());
});

describe('parseNicknameFromTitle', () => {
  it('takes first word before |', () => {
    expect(parseNicknameFromTitle('Sofia escort independiente en Madrid | Citapasion')).toBe(
      'Sofia',
    );
  });
  it('strips trailing punctuation', () => {
    expect(parseNicknameFromTitle('Ana,')).toBe('Ana');
  });
  it('empty → undefined', () => {
    expect(parseNicknameFromTitle('')).toBeUndefined();
  });
});
