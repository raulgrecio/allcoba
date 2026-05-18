import { describe, expect, it } from 'vitest';

import { extractDestacamos } from '#infrastructure/adapters/sources/dating/destacamos/destacamos.extractor.js';

import { listHtmlFixtures, loadHtmlFixture } from './helpers/load-fixtures.js';

const FIXTURE_URL = 'https://www.destacamos.net/92345-elena-escort-madrid.html';

describe('destacamos extractor — fixture: 92345_elena.html', () => {
  const html = loadHtmlFixture('92345_elena.html');
  const payload = extractDestacamos(html, FIXTURE_URL);

  it('extracts sourceId from URL', () => {
    expect(payload.sourceId).toBe('92345');
  });

  it('extracts title from h1.hh1', () => {
    expect(payload.title).toBe('Elena');
  });

  it('nickname = title (h1.hh1 is the name)', () => {
    expect(payload.nickname).toBe('Elena');
  });

  it('extracts bio from #description p', () => {
    expect(payload.bio).toBeDefined();
    expect(payload.bio).toMatch(/Hola soy Elena/i);
  });

  it('extracts phone from tel: href', () => {
    expect(payload.phone).toBe('612345678');
  });

  it('extracts whatsapp phone', () => {
    expect(payload.whatsappPhone).toBe('+34612345678');
  });

  it('isPremium=true from .premiumdet', () => {
    expect(payload.isPremium).toBe(true);
  });

  describe('params', () => {
    it('extracts age', () => {
      expect(payload.params.age).toBe('26');
    });

    it('extracts nationality', () => {
      expect(payload.params.nationality).toBe('Española');
    });

    it('extracts city', () => {
      expect(payload.params.city).toBe('Madrid');
    });

    it('extracts zone', () => {
      expect(payload.params.zone).toBe('Centro');
    });

    it('extracts heightRaw', () => {
      expect(payload.params.heightRaw).toMatch(/1'60/);
    });

    it('extracts hairColor', () => {
      expect(payload.params.hairColor).toBe('Morena');
    });

    it('extracts languages array', () => {
      expect(payload.params.languages).toEqual(['Español', 'Inglés']);
    });

    it('extracts schedule', () => {
      expect(payload.params.schedule).toBe('24 horas');
    });
  });

  describe('photos', () => {
    it('extracts 4 photos from #gallery a.fimage', () => {
      expect(payload.photos).toHaveLength(4);
    });

    it('photo srcs are full-size -g.jpg URLs', () => {
      for (const p of payload.photos) {
        expect(p.src).toMatch(/-g\.jpg$/);
      }
    });
  });
});

describe('destacamos extractor — all fixtures parse without throwing', () => {
  const fixtures = listHtmlFixtures();

  it('has at least one fixture', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  for (const filename of fixtures) {
    it(`${filename} parses without error`, () => {
      const html = loadHtmlFixture(filename);
      expect(() =>
        extractDestacamos(html, `https://www.destacamos.net/92345-test.html`),
      ).not.toThrow();
    });
  }
});
