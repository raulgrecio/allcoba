import { describe, expect, it } from 'vitest';

import {
  citySlugToName,
  extractMilescortsWhatsappPhone,
  parseCitySlugFromUrl,
  parseMilescortsAge,
  parseNicknameFromTitle,
  parsePhoneFromUrl,
  parseSourceIdFromUrl,
  slugifyMilescorts,
} from '#infrastructure/adapters/sources/dating/milescorts/milescorts.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it('extracts last numeric segment before .htm', () => {
    expect(
      parseSourceIdFromUrl(
        'https://www.milescorts.es/escorts-y-putas/madrid-ciudad/631594827-escort-sexy-396681.htm',
      ),
    ).toBe('396681');
  });

  it('works with .html extension', () => {
    expect(
      parseSourceIdFromUrl(
        'https://www.milescorts.es/escorts-y-putas/madrid-ciudad/631594827-slug-396681.html',
      ),
    ).toBe('396681');
  });
});

describe('parsePhoneFromUrl', () => {
  it('extracts first 9-digit segment from filename', () => {
    expect(
      parsePhoneFromUrl(
        'https://www.milescorts.es/escorts-y-putas/madrid-ciudad/631594827-escort-sexy-396681.htm',
      ),
    ).toBe('631594827');
  });

  it('returns undefined when no digit prefix in filename', () => {
    expect(parsePhoneFromUrl('https://www.milescorts.es/page/2')).toBeUndefined();
  });
});

describe('parseCitySlugFromUrl', () => {
  it('extracts penultimate path segment', () => {
    expect(
      parseCitySlugFromUrl(
        'https://www.milescorts.es/escorts-y-putas/madrid-ciudad/631594827-escort-396681.htm',
      ),
    ).toBe('madrid-ciudad');
  });

  it('falls back to string split on invalid URL (catch path)', () => {
    const result = parseCitySlugFromUrl('not-a-url/category/file.htm');
    expect(result).toBe('category');
  });
});

describe('citySlugToName', () => {
  it('replaces hyphens with spaces', () => {
    expect(citySlugToName('madrid-ciudad')).toBe('madrid ciudad');
  });
});

describe('slugifyMilescorts', () => {
  it('lowercases and strips accents', () => {
    expect(slugifyMilescorts('Española')).toBe('espanola');
    expect(slugifyMilescorts('Madrid Ciudad')).toBe('madrid-ciudad');
  });

  it('returns undefined for falsy', () => {
    expect(slugifyMilescorts(null)).toBeUndefined();
    expect(slugifyMilescorts('')).toBeUndefined();
  });

  it('returns undefined when result is empty after transforms', () => {
    expect(slugifyMilescorts('---')).toBeUndefined();
  });
});

describe('parseNicknameFromTitle', () => {
  it('extracts name before comma', () => {
    expect(parseNicknameFromTitle('Tania, escort sexy en tu zona')).toBe('Tania');
  });

  it('returns trimmed title when no separator', () => {
    expect(parseNicknameFromTitle('Sofia')).toBe('Sofia');
  });

  it('returns empty string for falsy', () => {
    expect(parseNicknameFromTitle(null)).toBe('');
    expect(parseNicknameFromTitle('')).toBe('');
  });
});

describe('parseMilescortsAge', () => {
  it('parses "24 años" → 24', () => {
    expect(parseMilescortsAge('24 años')).toBe(24);
  });

  it('returns undefined for falsy', () => {
    expect(parseMilescortsAge(null)).toBeUndefined();
    expect(parseMilescortsAge('')).toBeUndefined();
  });

  it('returns undefined when no digits in string', () => {
    expect(parseMilescortsAge('years')).toBeUndefined();
  });
});

describe('extractMilescortsWhatsappPhone', () => {
  it('extracts from wa.me URL', () => {
    expect(extractMilescortsWhatsappPhone('https://wa.me/34631594827')).toBe('+34631594827');
  });

  it('extracts from api.whatsapp.com phone param', () => {
    expect(
      extractMilescortsWhatsappPhone('https://api.whatsapp.com/send?phone=34631594827'),
    ).toBe('+34631594827');
  });

  it('returns undefined for falsy', () => {
    expect(extractMilescortsWhatsappPhone(null)).toBeUndefined();
    expect(extractMilescortsWhatsappPhone('')).toBeUndefined();
  });

  it('returns undefined when href does not match either pattern', () => {
    expect(extractMilescortsWhatsappPhone('https://example.com/contact')).toBeUndefined();
  });
});
