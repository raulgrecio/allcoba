import { describe, expect, it } from 'vitest';
import {
  parseSourceIdFromUrl,
  parseCityFromUrl,
  parseBluemovePhone,
  parseBluemoveWhatsapp,
  parseTelegramHandle,
  parseInstagramHandle,
  parseNicknameFromAlt,
  parseFirstInt,
  parseBoolNotNo,
  stripProvince,
} from '#infrastructure/adapters/sources/dating/bluemove/bluemove.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it.each([
    ['https://bluemove.es/madrid/escorts/#49049', '49049'],
    ['https://bluemove.es/barcelona/escorts/#12345', '12345'],
    ['https://bluemove.es/madrid/escorts/', 'escorts'],
  ])('%s → %s', (url, expected) => {
    expect(parseSourceIdFromUrl(url)).toBe(expected);
  });
});

describe('parseCityFromUrl', () => {
  it('extracts city before /escorts/', () => {
    expect(parseCityFromUrl('https://bluemove.es/madrid/escorts/#49049')).toBe('madrid');
    expect(parseCityFromUrl('https://bluemove.es/barcelona/escorts/#12345')).toBe('barcelona');
  });
  it('replaces hyphens with spaces', () => {
    expect(parseCityFromUrl('https://bluemove.es/san-sebastian/escorts/#1')).toBe('san sebastian');
  });
});

describe('parseBluemovePhone', () => {
  it.each([
    ['tel:+34678797126', '678797126'],
    ['tel:678797126', '678797126'],
    [undefined, undefined],
    ['tel:123', undefined],
  ])('%s → %s', (href, expected) => {
    expect(parseBluemovePhone(href)).toBe(expected);
  });
});

describe('parseBluemoveWhatsapp', () => {
  it.each([
    ['https://wa.me/34678797126?text=Hola', '678797126'],
    ['https://wa.me/678797126', '678797126'],
    [undefined, undefined],
    ['https://example.com', undefined],
  ])('%s → %s', (href, expected) => {
    expect(parseBluemoveWhatsapp(href)).toBe(expected);
  });
});

describe('parseTelegramHandle', () => {
  it('extracts handle from t.me URL', () => {
    expect(parseTelegramHandle('https://t.me/beatriz_escort')).toBe('beatriz_escort');
  });
  it('returns undefined for non-t.me', () => {
    expect(parseTelegramHandle('https://example.com')).toBeUndefined();
    expect(parseTelegramHandle(undefined)).toBeUndefined();
  });
});

describe('parseInstagramHandle', () => {
  it('extracts handle from instagram.com URL', () => {
    expect(parseInstagramHandle('https://www.instagram.com/beatriz_escort_madrid')).toBe('beatriz_escort_madrid');
  });
  it('returns undefined for non-instagram', () => {
    expect(parseInstagramHandle(undefined)).toBeUndefined();
  });
});

describe('parseNicknameFromAlt', () => {
  it('extracts name before comma, title-case', () => {
    expect(parseNicknameFromAlt('BEATRIZ, Escort en Madrid 678797126')).toBe('Beatriz');
  });
  it('single word', () => {
    expect(parseNicknameFromAlt('SOFIA')).toBe('Sofia');
  });
  it('returns undefined for empty/undefined', () => {
    expect(parseNicknameFromAlt(undefined)).toBeUndefined();
    expect(parseNicknameFromAlt('')).toBeUndefined();
  });
});

describe('parseFirstInt', () => {
  it.each([
    ['27', 27],
    ['168 cm', 168],
    ['58 kg', 58],
    [undefined, undefined],
    ['', undefined],
  ])('%s → %s', (text, expected) => {
    expect(parseFirstInt(text)).toBe(expected);
  });
});

describe('parseBoolNotNo', () => {
  it('returns false for "No"', () => expect(parseBoolNotNo('No')).toBe(false));
  it('returns true for "Si"', () => expect(parseBoolNotNo('Si')).toBe(true));
  it('returns true for other values', () => expect(parseBoolNotNo('Tatuajes discretos')).toBe(true));
  it('returns undefined for undefined', () => expect(parseBoolNotNo(undefined)).toBeUndefined());
});

describe('stripProvince', () => {
  it('strips "(Province)" suffix', () => {
    expect(stripProvince('Madrid (Madrid)')).toBe('Madrid');
    expect(stripProvince('Barcelona (Barcelona)')).toBe('Barcelona');
  });
  it('no-op when no parens', () => {
    expect(stripProvince('Madrid')).toBe('Madrid');
  });
  it('returns undefined for undefined', () => {
    expect(stripProvince(undefined)).toBeUndefined();
  });
});
