import { describe, expect, it } from 'vitest';

import { extractLoquosex } from '#infrastructure/adapters/sources/dating/loquosex/loquosex.extractor.js';

import { listHtmlFixtures, loadHtmlFixture } from './helpers/load-fixtures.js';

const FIXTURE_URL = 'https://loquosex.com/ven-a-conocerme-677684329.html/';

describe('loquosex extractor — fixture: 677684329.html', () => {
  const html = loadHtmlFixture('677684329.html');
  const payload = extractLoquosex(html, FIXTURE_URL);

  it('extracts sourceId from URL', () => {
    expect(payload.sourceId).toBe('677684329');
  });

  it('extracts title', () => {
    expect(payload.title).toMatch(/JOVEN Y GUAPA/);
  });

  it('extracts nickname from title (strips phone + comma)', () => {
    expect(payload.nickname).toBe('JOVEN Y GUAPA');
  });

  it('extracts bio', () => {
    expect(payload.bio).toBeDefined();
    expect(payload.bio).toMatch(/HOLA SOY/i);
  });

  it('extracts phone', () => {
    expect(payload.phone).toBe('677684329');
  });

  it('extracts whatsapp phone (E.164)', () => {
    expect(payload.whatsappPhone).toBe('+34677684329');
  });

  it('extracts whatsapp href', () => {
    expect(payload.whatsappHref).toBeDefined();
    expect(payload.whatsappHref).toMatch(/whatsapp|wa\.me/i);
  });

  describe('params', () => {
    it('extracts city', () => {
      expect(payload.params.city).toBe('Murcia');
    });

    it('extracts nationality', () => {
      expect(payload.params.nationality).toBe('Venezolana');
    });

    it('extracts age string', () => {
      expect(payload.params.age).toBe('25 años');
    });

    it('extracts priceMin', () => {
      expect(payload.params.priceMin).toBe('50 €');
    });

    it('isPremium = false', () => {
      expect(payload.params.isPremium).toBe(false);
    });
  });

  describe('services', () => {
    it('extracts 15 services total', () => {
      expect(payload.services).toHaveLength(15);
    });

    it('has included services', () => {
      const included = payload.services.filter((s) => s.included);
      expect(included.length).toBeGreaterThan(0);
    });

    it('has non-included services', () => {
      const excluded = payload.services.filter((s) => !s.included);
      expect(excluded.length).toBeGreaterThan(0);
    });

    it('includes expected services (24h, Masajes, Frances)', () => {
      const names = payload.services.map((s) => s.name);
      expect(names).toContain('24h');
      expect(names).toContain('Masajes');
      expect(names).toContain('Frances');
    });
  });

  describe('photos', () => {
    it('deduplicates photos (strips query params)', () => {
      expect(payload.photos.length).toBe(3);
    });

    it('photo srcs have no query string', () => {
      for (const p of payload.photos) {
        expect(p.src).not.toContain('?');
      }
    });
  });
});

describe('loquosex extractor — edge case branches', () => {
  const BASE_URL = 'https://loquosex.com/test-677684329.html/';

  it('tel: href fallback when .numero-telefono absent (L135 truthy arm)', () => {
    const html = `<html><body>
      <article><h1>Test</h1></article>
      <a href="tel:677684329">677684329</a>
    </body></html>`;
    const payload = extractLoquosex(html, BASE_URL);
    expect(payload.phone).toBe('677684329');
  });

  it('extractCharacteristicField returns undefined when text empty after strip (L42)', () => {
    const html = `<html><body>
      <ul class="caracteristicas-detalle-xxx">
        <li>Edad:</li>
      </ul>
    </body></html>`;
    const payload = extractLoquosex(html, BASE_URL);
    expect(payload.params.age).toBeUndefined();
  });

  it('city fallback chain — 1 Localidad link covers L78 inner || arms', () => {
    const html = `<html><body>
      <ul class="caracteristicas-detalle-xxx">
        <li>Localidad: <a href="/sevilla">Sevilla</a></li>
      </ul>
    </body></html>`;
    const payload = extractLoquosex(html, BASE_URL);
    expect(payload.params.city).toBe('Sevilla');
  });

  it('zone extracted from 4th Localidad link (L97 truthy spread)', () => {
    const html = `<html><body>
      <ul class="caracteristicas-detalle-xxx">
        <li>Localidad: <a>City</a><a>Country</a><a>Region</a><a>Zone</a></li>
      </ul>
    </body></html>`;
    const payload = extractLoquosex(html, BASE_URL);
    expect(payload.params.zone).toBe('Zone');
  });
});

describe('loquosex extractor — all fixtures parse without throwing', () => {
  const fixtures = listHtmlFixtures();

  it('has at least one fixture', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  for (const filename of fixtures) {
    it(`${filename} parses without error`, () => {
      const html = loadHtmlFixture(filename);
      expect(() => extractLoquosex(html, `https://loquosex.com/${filename}`)).not.toThrow();
    });
  }
});
