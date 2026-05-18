import { describe, expect, it } from 'vitest';

import {
  extractArdientePlacerWhatsappPhone,
  parseArdientePlacerAge,
  parseArdientePlacerRate,
  parseCityFromUrl,
  parseNicknameFromTitle,
  parsePhoneFromUrl,
  parseSourceIdFromUrl,
  slugifyArdienteplacer,
} from '#infrastructure/adapters/sources/dating/ardienteplacer/ardienteplacer.parsers.js';

const FIXTURE_URL =
  'https://www.ardienteplacer.com/index.php/escort/putas-guarras/madrid/632277902/92010';

describe('parseSourceIdFromUrl', () => {
  it('extracts last path segment (ad ID)', () => {
    expect(parseSourceIdFromUrl(FIXTURE_URL)).toBe('92010');
  });
});

describe('parsePhoneFromUrl', () => {
  it('extracts 9-digit phone from 2nd-to-last segment', () => {
    expect(parsePhoneFromUrl(FIXTURE_URL)).toBe('632277902');
  });

  it('returns undefined when no digit segment', () => {
    expect(parsePhoneFromUrl('https://ardienteplacer.com/page/2')).toBeUndefined();
  });
});

describe('parseCityFromUrl', () => {
  it('extracts city from 3rd-to-last segment', () => {
    expect(parseCityFromUrl(FIXTURE_URL)).toBe('madrid');
  });

  it('replaces hyphens with spaces', () => {
    expect(
      parseCityFromUrl(
        'https://ardienteplacer.com/escort/cat/barcelona-ciudad/632277902/92010',
      ),
    ).toBe('barcelona ciudad');
  });
});

describe('slugifyArdienteplacer', () => {
  it('lowercases and strips accents', () => {
    expect(slugifyArdienteplacer('Española')).toBe('espanola');
  });

  it('returns undefined for falsy', () => {
    expect(slugifyArdienteplacer(null)).toBeUndefined();
    expect(slugifyArdienteplacer('')).toBeUndefined();
  });
});

describe('parseNicknameFromTitle', () => {
  it('strips everything after dash', () => {
    expect(parseNicknameFromTitle('Carmen - Escort independiente Madrid')).toBe('Carmen');
  });

  it('returns trimmed title when no dash', () => {
    expect(parseNicknameFromTitle('Sofia')).toBe('Sofia');
  });

  it('returns empty string for falsy', () => {
    expect(parseNicknameFromTitle(null)).toBe('');
    expect(parseNicknameFromTitle('')).toBe('');
  });
});

describe('parseArdientePlacerAge', () => {
  it('parses "28 años" → 28', () => {
    expect(parseArdientePlacerAge('28 años')).toBe(28);
  });

  it('returns undefined for falsy', () => {
    expect(parseArdientePlacerAge(null)).toBeUndefined();
    expect(parseArdientePlacerAge('')).toBeUndefined();
  });
});

describe('parseArdientePlacerRate', () => {
  it('parses "80 €/hora" → 80', () => {
    expect(parseArdientePlacerRate('80 €/hora')).toBe(80);
  });

  it('parses "100 €/h" → 100', () => {
    expect(parseArdientePlacerRate('100 €/h')).toBe(100);
  });

  it('returns undefined for falsy', () => {
    expect(parseArdientePlacerRate(null)).toBeUndefined();
    expect(parseArdientePlacerRate('')).toBeUndefined();
  });
});

describe('extractArdientePlacerWhatsappPhone', () => {
  it('extracts from wa.me URL', () => {
    expect(extractArdientePlacerWhatsappPhone('https://wa.me/34632277902?text=Hola')).toBe(
      '+34632277902',
    );
  });

  it('extracts from api.whatsapp.com phone param', () => {
    expect(
      extractArdientePlacerWhatsappPhone('https://api.whatsapp.com/send?phone=34632277902'),
    ).toBe('+34632277902');
  });

  it('returns undefined for falsy', () => {
    expect(extractArdientePlacerWhatsappPhone(null)).toBeUndefined();
  });
});
