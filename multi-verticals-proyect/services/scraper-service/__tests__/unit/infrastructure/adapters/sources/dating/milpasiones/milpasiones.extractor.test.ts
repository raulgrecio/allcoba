import { describe, expect, it } from 'vitest';

import { extractMilpasiones } from '#infrastructure/adapters/sources/dating/milpasiones/milpasiones.extractor.js';

import { listHtmlFixtures, loadHtmlFixture } from './helpers/load-fixtures.js';

const FIXTURE_URL =
  'https://milpasiones.com/anuncio/662583238-carinosa-morbosa-muy-implicada_215990/';

describe('milpasiones extractor — fixture: 662583238_215990.html', () => {
  const html = loadHtmlFixture('662583238_215990.html');
  const payload = extractMilpasiones(html, FIXTURE_URL);

  it('extracts sourceId from URL', () => {
    expect(payload.sourceId).toBe('215990');
  });

  it('extracts title from og:title', () => {
    expect(payload.title).toContain('NATALIA');
  });

  it('extracts nickname from title (first word after phone)', () => {
    expect(payload.nickname).toBe('NATALIA');
  });

  it('extracts bio from og:description', () => {
    expect(payload.bio).toBeDefined();
    expect(payload.bio).toMatch(/Hola soy Natalia/i);
  });

  it('extracts phone from URL', () => {
    expect(payload.phone).toBe('662583238');
  });

  describe('params', () => {
    it('extracts city from geo.placename', () => {
      expect(payload.params.city).toBe('Estepona');
    });
  });

  describe('photos', () => {
    it('extracts 3 photos from og:image meta tags', () => {
      expect(payload.photos).toHaveLength(3);
    });

    it('photo srcs from cdn', () => {
      for (const p of payload.photos) {
        expect(p.src).toMatch(/cdn\.milpasiones\.com/);
      }
    });
  });
});

describe('milpasiones extractor — all fixtures parse without throwing', () => {
  const fixtures = listHtmlFixtures();

  it('has at least one fixture', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  for (const filename of fixtures) {
    it(`${filename} parses without error`, () => {
      const html = loadHtmlFixture(filename);
      expect(() =>
        extractMilpasiones(html, `https://milpasiones.com/anuncio/662583238-slug_99999/`),
      ).not.toThrow();
    });
  }
});
