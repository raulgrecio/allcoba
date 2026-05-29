import { describe, expect, it } from 'vitest';

import {
  parseHotvalenciaPhone,
  parseNicknameFromTitle,
  parseSourceIdFromUrl,
} from '#infrastructure/adapters/sources/dating/hotvalencia/hotvalencia.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it.each([
    [
      'https://hotvalencia.com/putas-valencia/valentina-escortvalencia/',
      'valentina-escortvalencia',
    ],
    ['https://hotvalencia.com/putas-valencia/sofia/', 'sofia'],
  ])('%s → %s', (url, expected) => {
    expect(parseSourceIdFromUrl(url)).toBe(expected);
  });
});

describe('parseHotvalenciaPhone', () => {
  it.each([
    ['tel:+34611223344', '611223344'],
    ['tel:611223344', '611223344'],
    [undefined, undefined],
    ['tel:123', undefined],
  ])('%s → %s', (href, expected) => {
    expect(parseHotvalenciaPhone(href)).toBe(expected);
  });
});

describe('parseNicknameFromTitle', () => {
  it('extracts first word', () =>
    expect(parseNicknameFromTitle('Valentina escort Valencia')).toBe('Valentina'));
  it('strips trailing punctuation', () => expect(parseNicknameFromTitle('Sofia,')).toBe('Sofia'));
  it('empty → undefined', () => expect(parseNicknameFromTitle('')).toBeUndefined());
});
