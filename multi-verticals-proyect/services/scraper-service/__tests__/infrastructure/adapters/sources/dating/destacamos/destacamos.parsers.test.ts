import { describe, expect, it } from 'vitest';

import {
  extractDestacamosWhatsappPhone,
  parseDestacamosAge,
  parseDestacamosHeightCm,
  parseDestacamosLanguages,
  parseSourceIdFromUrl,
  slugifyDestacamos,
} from '#infrastructure/adapters/sources/dating/destacamos/destacamos.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it('extracts id from /{id}- slug pattern', () => {
    expect(
      parseSourceIdFromUrl('https://www.destacamos.net/92345-elena-escort-madrid.html'),
    ).toBe('92345');
  });

  it('extracts id from /opiniones/{id}', () => {
    expect(parseSourceIdFromUrl('https://www.destacamos.net/opiniones/92345')).toBe('92345');
  });

  it('extracts id from ?id= query param', () => {
    expect(parseSourceIdFromUrl('https://www.destacamos.net/details.html?id=92345')).toBe('92345');
  });
});

describe('slugifyDestacamos', () => {
  it('lowercases and strips accents', () => {
    expect(slugifyDestacamos('Española')).toBe('espanola');
    expect(slugifyDestacamos('Madrid')).toBe('madrid');
  });

  it('returns undefined for falsy', () => {
    expect(slugifyDestacamos(null)).toBeUndefined();
    expect(slugifyDestacamos('')).toBeUndefined();
  });
});

describe('parseDestacamosAge', () => {
  it('parses "26" → 26', () => {
    expect(parseDestacamosAge('26')).toBe(26);
  });

  it('parses "26 años" → 26', () => {
    expect(parseDestacamosAge('26 años')).toBe(26);
  });

  it('returns undefined for falsy', () => {
    expect(parseDestacamosAge(null)).toBeUndefined();
    expect(parseDestacamosAge('')).toBeUndefined();
  });
});

describe('parseDestacamosHeightCm', () => {
  it("parses \"entre 1'60 y 1'70\" → 160", () => {
    expect(parseDestacamosHeightCm("entre 1'60 y 1'70")).toBe(160);
  });

  it("parses \"1'65\" → 165", () => {
    expect(parseDestacamosHeightCm("1'65")).toBe(165);
  });

  it('returns undefined for falsy', () => {
    expect(parseDestacamosHeightCm(null)).toBeUndefined();
    expect(parseDestacamosHeightCm('')).toBeUndefined();
  });
});

describe('parseDestacamosLanguages', () => {
  it('splits CSV', () => {
    expect(parseDestacamosLanguages('Español, Inglés')).toEqual(['Español', 'Inglés']);
  });

  it('returns empty array for falsy', () => {
    expect(parseDestacamosLanguages(null)).toEqual([]);
  });
});

describe('extractDestacamosWhatsappPhone', () => {
  it('extracts from wa.me URL', () => {
    expect(extractDestacamosWhatsappPhone('https://wa.me/34612345678')).toBe('+34612345678');
  });

  it('returns undefined for falsy', () => {
    expect(extractDestacamosWhatsappPhone(null)).toBeUndefined();
  });
});
