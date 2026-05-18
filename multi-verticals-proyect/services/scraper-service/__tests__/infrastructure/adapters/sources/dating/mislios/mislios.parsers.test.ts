import { describe, expect, it } from 'vitest';
import {
  parseSourceIdFromUrl,
  parseMisliosPhone,
  parseNicknameFromTitle,
} from '#infrastructure/adapters/sources/dating/mislios/mislios.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it.each([
    ['https://mislios.com/anuncios/ana-escort-madrid/', 'ana-escort-madrid'],
    ['https://mislios.com/anuncios/sofia-123/', 'sofia-123'],
    ['https://mislios.com/anuncios/elena/', 'elena'],
  ])('%s → %s', (url, expected) => {
    expect(parseSourceIdFromUrl(url)).toBe(expected);
  });
});

describe('parseMisliosPhone', () => {
  it.each([
    ['tel:+34622345678', '622345678'],
    ['tel:622345678', '622345678'],
    ['tel:34622345678', '622345678'],
    [undefined, undefined],
    ['tel:123', undefined],
    ['tel:000', undefined],
  ])('%s → %s', (href, expected) => {
    expect(parseMisliosPhone(href)).toBe(expected);
  });
});

describe('parseNicknameFromTitle', () => {
  it('extracts first word', () => expect(parseNicknameFromTitle('Ana escort Madrid')).toBe('Ana'));
  it('strips trailing punctuation', () => expect(parseNicknameFromTitle('Sofia,')).toBe('Sofia'));
  it('single word', () => expect(parseNicknameFromTitle('Elena')).toBe('Elena'));
  it('empty string → undefined', () => expect(parseNicknameFromTitle('')).toBeUndefined());
});
