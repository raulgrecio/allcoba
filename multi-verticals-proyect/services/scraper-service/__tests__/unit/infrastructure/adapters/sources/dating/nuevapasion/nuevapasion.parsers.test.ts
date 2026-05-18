import { describe, expect, it } from 'vitest';
import {
  parseSourceIdFromUrl,
  parseNuevapasionPhone,
  parseNicknameFromTitle,
} from '#infrastructure/adapters/sources/dating/nuevapasion/nuevapasion.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it.each([
    ['https://nuevapasion.com/anuncio/quieres-disfrutar-ven-j9ZZ3vFBjb', 'quieres-disfrutar-ven-j9ZZ3vFBjb'],
    ['https://nuevapasion.com/anuncio/sofia-abc123', 'sofia-abc123'],
  ])('%s → %s', (url, expected) => {
    expect(parseSourceIdFromUrl(url)).toBe(expected);
  });
});

describe('parseNuevapasionPhone', () => {
  it.each([
    ['tel:+34655123456', '655123456'],
    ['tel:655123456', '655123456'],
    ['tel:34655123456', '655123456'],
    [undefined, undefined],
    ['tel:123', undefined],
  ])('%s → %s', (href, expected) => {
    expect(parseNuevapasionPhone(href)).toBe(expected);
  });
});

describe('parseNicknameFromTitle', () => {
  it('extracts first word', () => expect(parseNicknameFromTitle('Sofia García')).toBe('Sofia'));
  it('strips trailing punctuation', () => expect(parseNicknameFromTitle('Ana,')).toBe('Ana'));
  it('single word', () => expect(parseNicknameFromTitle('Mia')).toBe('Mia'));
});
