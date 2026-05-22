import { describe, expect, it } from 'vitest';

import { extractMilescorts } from '#infrastructure/adapters/sources/dating/milescorts/milescorts.extractor.js';

import { listHtmlFixtures, loadHtmlFixture } from './helpers/load-fixtures.js';

const FIXTURE_URL =
  'https://www.milescorts.es/escorts-y-putas/madrid-ciudad/631594827-escort-sexy-en-tu-zona-396681.htm';

describe('milescorts extractor — fixture: 631594827_396681.html', () => {
  const html = loadHtmlFixture('631594827_396681.html');
  const payload = extractMilescorts(html, FIXTURE_URL);

  it('extracts sourceId from URL (ad ID)', () => {
    expect(payload.sourceId).toBe('396681');
  });

  it('extracts title', () => {
    expect(payload.title).toContain('Tania');
  });

  it('extracts nickname from title', () => {
    expect(payload.nickname).toBe('Tania');
  });

  it('extracts bio', () => {
    expect(payload.bio).toBeDefined();
    expect(payload.bio).toMatch(/Hola soy Tania/i);
  });

  it('extracts phone from URL', () => {
    expect(payload.phone).toBe('631594827');
  });

  it('extracts whatsapp phone', () => {
    expect(payload.whatsappPhone).toBe('+34631594827');
  });

  it('extracts whatsapp href', () => {
    expect(payload.whatsappHref).toBeDefined();
    expect(payload.whatsappHref).toMatch(/wa\.me|whatsapp/i);
  });

  it('isVerified=true from Verificada badge', () => {
    expect(payload.isVerified).toBe(true);
  });

  describe('params', () => {
    it('extracts city from URL', () => {
      expect(payload.params.city).toBe('madrid ciudad');
    });

    it('extracts age string', () => {
      expect(payload.params.age).toBe('24 años');
    });

    it('extracts nationality', () => {
      expect(payload.params.nationality).toBe('Española');
    });
  });

  describe('photos', () => {
    it('extracts 3 photos', () => {
      expect(payload.photos).toHaveLength(3);
    });

    it('photo srcs from cdn', () => {
      for (const p of payload.photos) {
        expect(p.src).toMatch(/cdn\.milescorts\.es/);
      }
    });
  });
});

describe('milescorts extractor — all fixtures parse without throwing', () => {
  const fixtures = listHtmlFixtures();

  it('has at least one fixture', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  for (const filename of fixtures) {
    it(`${filename} parses without error`, () => {
      const html = loadHtmlFixture(filename);
      expect(() => extractMilescorts(html, `https://www.milescorts.es/${filename}`)).not.toThrow();
    });
  }
});
