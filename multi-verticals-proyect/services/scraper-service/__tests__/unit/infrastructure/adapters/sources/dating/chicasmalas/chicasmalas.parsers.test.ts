import { describe, expect, it } from 'vitest';

import {
  parseChicasmalasPhone,
  parseChicasmalasWhatsapp,
  parseCityFromMapsUrl,
  parseCityFromSlug,
  parseNicknameFromMetaTitle,
  parsePhoneFromSlug,
  parseSourceIdFromUrl,
} from '#infrastructure/adapters/sources/dating/chicasmalas/chicasmalas.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it.each([
    [
      'https://www.chicasmalas.es/maria-escort-espanola-en-orihuela-697394223/',
      'maria-escort-espanola-en-orihuela-697394223',
    ],
    ['https://www.chicasmalas.es/sofia-escort-madrid-611223344', 'sofia-escort-madrid-611223344'],
  ])('%s → %s', (url, expected) => {
    expect(parseSourceIdFromUrl(url)).toBe(expected);
  });

  it('returns empty string for root URL with no slug', () => {
    expect(parseSourceIdFromUrl('https://www.chicasmalas.es/')).toBe('');
  });
});

describe('parsePhoneFromSlug', () => {
  it.each([
    ['maria-escort-espanola-en-orihuela-697394223', '697394223'],
    ['sofia-escort-madrid-611223344', '611223344'],
    ['no-phone-here', undefined],
  ])('%s → %s', (slug, expected) => {
    expect(parsePhoneFromSlug(slug)).toBe(expected);
  });
});

describe('parseCityFromSlug', () => {
  it.each([
    ['maria-escort-espanola-en-orihuela-697394223', 'orihuela'],
    ['sofia-escort-madrid-611223344', 'madrid'],
    ['ana-barcelona-699111222', 'barcelona'],
  ])('%s → %s', (slug, expected) => {
    expect(parseCityFromSlug(slug)).toBe(expected);
  });

  it('returns undefined when last segment after phone removal is empty', () => {
    // slug like "name--697394223": after removing "-697394223", "name-" → parts = ["name", ""] → last is ""
    expect(parseCityFromSlug('name--697394223')).toBeUndefined();
  });
});

describe('parseNicknameFromMetaTitle', () => {
  it('extracts first word before space', () =>
    expect(parseNicknameFromMetaTitle('María Escort Española En Orihuela — Discreción.')).toBe(
      'María',
    ));

  it('handles single-word title', () => expect(parseNicknameFromMetaTitle('Sofia')).toBe('Sofia'));

  it('returns undefined for empty', () => expect(parseNicknameFromMetaTitle('')).toBeUndefined());

  it('returns undefined when first token trims to empty string', () =>
    expect(parseNicknameFromMetaTitle(' Escort')).toBeUndefined());
});

describe('parseChicasmalasPhone', () => {
  it.each([
    ['tel:+34697394223', '697394223'],
    ['tel://697394223', '697394223'],
    ['tel:697394223', '697394223'],
    ['tel:34697394223', '697394223'],
    ['tel:12345', undefined],
    ['', undefined],
  ])('%s → %s', (href, expected) => {
    expect(parseChicasmalasPhone(href)).toBe(expected);
  });
});

describe('parseChicasmalasWhatsapp', () => {
  it.each([
    ['https://api.whatsapp.com/send?phone=+34697394223&text=Hola', '697394223'],
    ['https://api.whatsapp.com/send?phone=34611223344', '611223344'],
    ['https://wa.me/34697394223', '697394223'],
    ['https://api.whatsapp.com/send?phone=123', undefined],
    ['https://other.com', undefined],
  ])('%s → %s', (href, expected) => {
    expect(parseChicasmalasWhatsapp(href)).toBe(expected);
  });

  it('returns undefined when phone cannot be determined (null phone)', () => {
    // Non-wa.me, no phone param → phone is null
    expect(parseChicasmalasWhatsapp('https://telegram.me/username')).toBeUndefined();
  });

  it('returns undefined on invalid URL (catch path)', () => {
    expect(parseChicasmalasWhatsapp('not-a-url::invalid')).toBeUndefined();
  });
});

describe('parseCityFromMapsUrl', () => {
  it.each([
    ['https://maps.google.com/maps?q=ORIHUELA%20ALICANTE&t=m&z=10&output=embed', 'orihuela'],
    ['https://maps.google.com/maps?q=MADRID&t=m', 'madrid'],
    ['https://maps.google.com/maps?q=Barcelona%2C+Espa%C3%B1a', 'barcelona'],
    ['https://other.com', undefined],
  ])('%s → %s', (src, expected) => {
    expect(parseCityFromMapsUrl(src)).toBe(expected);
  });

  it('returns undefined on invalid URL (catch path)', () => {
    expect(parseCityFromMapsUrl('not-a-url::invalid')).toBeUndefined();
  });
});
