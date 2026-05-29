import { describe, expect, it } from 'vitest';

import {
  parseFirstInt,
  parseGemidosPhone,
  parseNicknameFromTitle,
  parseSourceIdFromUrl,
} from '#infrastructure/adapters/sources/dating/gemidos/gemidos.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it.each([
    ['https://gemidos.tv/anuncio/lucia-escort-madrid/', 'lucia-escort-madrid'],
    ['https://gemidos.tv/anuncio/sofia-123/', 'sofia-123'],
  ])('%s → %s', (url, expected) => {
    expect(parseSourceIdFromUrl(url)).toBe(expected);
  });
});

describe('parseGemidosPhone', () => {
  it.each([
    ['633 445 566', '633445566'],
    ['633445566', '633445566'],
    ['+34633445566', '633445566'],
    [undefined, undefined],
    ['123', undefined],
  ])('%s → %s', (text, expected) => {
    expect(parseGemidosPhone(text)).toBe(expected);
  });
});

describe('parseFirstInt', () => {
  it.each([
    ['26Años', 26],
    ['165CM', 165],
    ['52KG', 52],
    [undefined, undefined],
    ['', undefined],
  ])('%s → %s', (text, expected) => {
    expect(parseFirstInt(text)).toBe(expected);
  });
});

describe('parseNicknameFromTitle', () => {
  it('strips emoji and extracts first word', () => {
    expect(parseNicknameFromTitle('🔥 Lucia escort Madrid')).toBe('Lucia');
  });
  it('handles plain name', () => {
    expect(parseNicknameFromTitle('Sofia escort')).toBe('Sofia');
  });
  it('empty → undefined', () => {
    expect(parseNicknameFromTitle('')).toBeUndefined();
  });
});
