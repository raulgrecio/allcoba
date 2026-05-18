import { describe, it, expect, beforeAll } from 'vitest';

import { extractErosguia } from '#infrastructure/adapters/sources/dating/erosguia/erosguia.extractor.js';
import type { ErosguiaPayload } from '#infrastructure/adapters/sources/dating/erosguia/erosguia.types.js';

import { loadHtmlFixture } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://www.erosguia.com/55383.html';

let payload: ErosguiaPayload;

beforeAll(() => {
  const html = loadHtmlFixture('anny_55383.html');
  payload = extractErosguia(html, SOURCE_URL);
});

describe('extractErosguia — anny_55383', () => {
  describe('page identifiers', () => {
    it('derives sourceId from URL numeric path', () =>
      expect(payload.sourceId).toBe('55383'));

    it('preserves sourceUrl', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  });

  describe('nickname', () => {
    it('extracts from h1.title-ad first span', () => expect(payload.nickname).toBe('Anny'));
  });

  describe('params', () => {
    it('extracts city', () => expect(payload.params.city).toBe('Madrid'));
    it('extracts nationality', () => expect(payload.params.nationality).toBe('Colombiana'));
    it('extracts age raw string', () => expect(payload.params.age).toBe('22 años'));
    it('extracts height raw string', () => expect(payload.params.heightCm).toBe('160 cm.'));

    it('extracts languages from responsive panel', () => {
      expect(payload.params.languages).toContain('Español');
      expect(payload.params.languages).toContain('Inglés');
    });

    it('languages array has no duplicates (single panel)', () =>
      expect(new Set(payload.params.languages).size).toBe(payload.params.languages.length));
  });

  describe('services', () => {
    it('extracts 12 services from responsive panel', () =>
      expect(payload.services.length).toBe(12));

    it('no duplicate services (scoped to responsive only)', () =>
      expect(new Set(payload.services).size).toBe(payload.services.length));

    it('includes Cenas Románticas', () =>
      expect(payload.services).toContain('Cenas Románticas'));

    it('includes Girlfriend Experience', () =>
      expect(payload.services).toContain('Girlfriend Experience'));

    it('includes Masajes a Hoteles', () =>
      expect(payload.services).toContain('Masajes a Hoteles'));
  });

  describe('bio', () => {
    it('extracts bio text', () => expect(payload.bio).toMatch(/Anny|bonita|Madrid/i));

    it('no duplicated bio text (single panel scoping)', () => {
      const text = payload.bio ?? '';
      expect(text.length).toBeGreaterThan(0);
      // Bio text should not repeat itself (would double if both panels included)
      const half = text.slice(0, 30);
      expect(text.indexOf(half, 30)).toBe(-1);
    });
  });

  describe('contact', () => {
    it('extracts call phone from title', () => expect(payload.phone).toBe('614246033'));

    it('extracts whatsapp phone from wa.me href', () =>
      expect(payload.whatsappPhone).toBe('+34643435399'));

    it('call phone and WA number are different', () =>
      expect(payload.phone).not.toBe(payload.whatsappPhone?.replace('+34', '')));

    it('preserves whatsapp href', () =>
      expect(payload.whatsappHref).toMatch(/wa\.me\/34643435399/));

    it('extracts telegram href', () =>
      expect(payload.telegramHref).toMatch(/t\.me\/\+34643435399/));
  });

  describe('photos', () => {
    it('collects cover + 6 gallery photos = 7 total', () =>
      expect(payload.photos.length).toBe(7));

    it('all photos from eros.bz domain', () =>
      payload.photos.forEach((p) => expect(p.src).toMatch(/eros\.bz/)));

    it('no duplicate photo URLs', () => {
      const srcs = payload.photos.map((p) => p.src);
      expect(new Set(srcs).size).toBe(srcs.length);
    });

    it('no data: URIs in photos', () =>
      payload.photos.forEach((p) => expect(p.src).not.toMatch(/^data:/)));

    it('cover photo is first', () =>
      expect(payload.photos[0]!.src).toMatch(/fichas\/55383/));
  });
});
