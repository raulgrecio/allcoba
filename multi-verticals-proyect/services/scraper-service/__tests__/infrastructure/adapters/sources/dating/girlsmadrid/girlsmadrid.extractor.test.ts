import { describe, it, expect, beforeAll } from 'vitest';

import { extractGirlsMadrid } from '#infrastructure/adapters/sources/dating/girlsmadrid/girlsmadrid.extractor.js';
import type { GirlsBcnPayload } from '#infrastructure/adapters/sources/dating/girlsbcn/girlsbcn.types.js';

import { loadHtmlFixture } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://www.girlsmadrid.com/escort-lucia167.html';

let payload: GirlsBcnPayload;

beforeAll(() => {
  const html = loadHtmlFixture('lucia167.html');
  payload = extractGirlsMadrid(html, SOURCE_URL);
});

describe('extractGirlsMadrid — lucia167', () => {
  describe('page identifiers', () => {
    it('derives sourceId from URL path', () => expect(payload.sourceId).toBe('escort-lucia167'));
    it('preserves sourceUrl', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  });

  describe('nickname', () => {
    it('converts ALL-CAPS to title case', () => expect(payload.nickname).toBe('Lucia Haro'));
  });

  describe('bio', () => {
    it('extracts presentación text', () =>
      expect(payload.bio).toMatch(/universidad|madrileña/i));
  });

  describe('params', () => {
    it('extracts age', () => expect(payload.params.age).toBe('22 años'));
    it('extracts measurements', () => expect(payload.params.measurements).toBe('85 - 60 - 95'));
    it('extracts height', () => expect(payload.params.heightCm).toBe('172 cm.'));
    it('extracts weight', () => expect(payload.params.weightKg).toBe('58 Kg.'));
    it('extracts hair color', () => expect(payload.params.hairColor).toBe('Negro'));
    it('extracts eye color', () => expect(payload.params.eyeColor).toBe('Marrones'));
    it('extracts nationality', () => expect(payload.params.nationality).toBe('Española'));
    it('extracts schedule', () => expect(payload.params.schedule).toMatch(/8h/));
    it('city is hardcoded Madrid', () => expect(payload.params.city).toBe('Madrid'));
    it('extracts languages', () => {
      expect(payload.params.languages).toContain('Español');
      expect(payload.params.languages).toContain('English');
    });
    it('extracts price range 4', () => expect(payload.params.priceRange).toBe(4));
    it('extracts meetingPlaces', () => {
      expect(payload.params.meetingPlaces).toContain('En tu casa');
      expect(payload.params.meetingPlaces).toContain('Hoteles');
    });
  });

  describe('contact', () => {
    it('extracts phone', () => expect(payload.phone).toBe('641351077'));
    it('extracts whatsapp phone', () => expect(payload.whatsappPhone).toBe('+34641351077'));
    it('extracts whatsapp href', () =>
      expect(payload.whatsappHref).toMatch(/wa\.me\/34641351077/));
  });

  describe('photos', () => {
    it('extracts at least 3 photos', () => expect(payload.photos.length).toBeGreaterThanOrEqual(3));
    it('photos have gbcnmedia URLs', () =>
      payload.photos.forEach((p) => expect(p.src).toMatch(/gbcnmedia/)));
    it('no data: URIs in photos', () =>
      payload.photos.forEach((p) => expect(p.src).not.toMatch(/^data:/)));
    it('no duplicate photo URLs', () => {
      const srcs = payload.photos.map((p) => p.src);
      expect(new Set(srcs).size).toBe(srcs.length);
    });
  });

  describe('video', () => {
    it('video is undefined (no video in fixture)', () => expect(payload.video).toBeUndefined());
  });
});
