import { describe, expect, it } from 'vitest';

import { extractArdienteplacer } from '#infrastructure/adapters/sources/dating/ardienteplacer/ardienteplacer.extractor.js';

import { listHtmlFixtures, loadHtmlFixture } from './helpers/load-fixtures.js';

const FIXTURE_URL =
  'https://www.ardienteplacer.com/index.php/escort/putas-guarras/madrid/632277902/92010';

describe('ardienteplacer extractor — fixture: 632277902_92010.html', () => {
  const html = loadHtmlFixture('632277902_92010.html');
  const payload = extractArdienteplacer(html, FIXTURE_URL);

  it('extracts sourceId (ad ID)', () => {
    expect(payload.sourceId).toBe('92010');
  });

  it('extracts title', () => {
    expect(payload.title).toContain('Carmen');
  });

  it('extracts nickname from title (before dash)', () => {
    expect(payload.nickname).toBe('Carmen');
  });

  it('extracts bio (strips toplistingblock)', () => {
    expect(payload.bio).toBeDefined();
    expect(payload.bio).toMatch(/Hola soy Carmen/i);
    expect(payload.bio).not.toMatch(/Recuerda mencionar/);
  });

  it('extracts phone from modal', () => {
    expect(payload.phone).toBe('632277902');
  });

  it('extracts whatsapp phone', () => {
    expect(payload.whatsappPhone).toBe('+34632277902');
  });

  it('extracts whatsapp href', () => {
    expect(payload.whatsappHref).toMatch(/wa\.me/);
  });

  describe('params', () => {
    it('extracts city from postcatblock', () => {
      expect(payload.params.city).toBe('Madrid');
    });

    it('extracts nationality from flag alt', () => {
      expect(payload.params.nationality).toBe('España');
    });

    it('extracts age string', () => {
      expect(payload.params.age).toBe('28 años');
    });

    it('extracts rateRaw', () => {
      expect(payload.params.rateRaw).toBe('80 €/hora');
    });
  });

  describe('services', () => {
    it('extracts 4 services', () => {
      expect(payload.services).toHaveLength(4);
    });

    it('includes expected services', () => {
      expect(payload.services).toContain('Francés natural');
      expect(payload.services).toContain('Masajes eróticos');
    });
  });

  describe('photos', () => {
    it('extracts 3 photos from data-lightbox hrefs', () => {
      expect(payload.photos).toHaveLength(3);
    });

    it('photo srcs are full-size -g.jpg URLs', () => {
      for (const p of payload.photos) {
        expect(p.src).toMatch(/-g\.jpg$/);
      }
    });
  });
});

describe('ardienteplacer extractor — all fixtures parse without throwing', () => {
  const fixtures = listHtmlFixtures();

  it('has at least one fixture', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  for (const filename of fixtures) {
    it(`${filename} parses without error`, () => {
      const html = loadHtmlFixture(filename);
      expect(() =>
        extractArdienteplacer(html, `https://ardienteplacer.com/escort/cat/madrid/123456789/99999`),
      ).not.toThrow();
    });
  }
});
