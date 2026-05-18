import { describe, it, expect, beforeAll } from 'vitest';

import { extractGirlsBcn } from '#infrastructure/adapters/sources/dating/girlsbcn/girlsbcn.extractor.js';
import type { GirlsBcnPayload } from '#infrastructure/adapters/sources/dating/girlsbcn/girlsbcn.types.js';

import { loadHtmlFixture } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://www.girlsbcn.net/escort/gbcamila105.html';

let payload: GirlsBcnPayload;

beforeAll(() => {
  const html = loadHtmlFixture('camila105.html');
  payload = extractGirlsBcn(html, SOURCE_URL);
});

describe('extractGirlsBcn — camila105', () => {
  describe('page identifiers', () => {
    it('derives sourceId from URL', () => expect(payload.sourceId).toBe('gbcamila105'));
    it('preserves sourceUrl', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  });

  describe('nickname', () => {
    it('extracts name from h1.css_escort', () => expect(payload.nickname).toBe('Camila'));
  });

  describe('params', () => {
    it('extracts age', () => expect(payload.params.age).toBe('25 años'));
    it('extracts measurements', () => expect(payload.params.measurements).toBe('80 - 60 - 95'));
    it('extracts height', () => expect(payload.params.heightCm).toBe('160 cm.'));
    it('extracts weight', () => expect(payload.params.weightKg).toBe('55 Kg.'));
    it('extracts hair color', () => expect(payload.params.hairColor).toBe('Negro'));
    it('extracts eye color', () => expect(payload.params.eyeColor).toBe('Marrones'));
    it('extracts nationality', () => expect(payload.params.nationality).toBe('Colombiana'));
    it('extracts schedule', () => expect(payload.params.schedule).toBe('Full time'));
    it('extracts city from disponible-en text', () => expect(payload.params.city).toBe('Barcelona'));
    it('extracts languages', () => expect(payload.params.languages).toContain('Castellano'));
    it('extracts price range', () => expect(payload.params.priceRange).toBe(1));
  });

  describe('contact', () => {
    it('extracts phone', () => expect(payload.phone).toBe('663475960'));
    it('extracts whatsapp phone', () => expect(payload.whatsappPhone).toBe('+34663475960'));
    it('extracts whatsapp href', () =>
      expect(payload.whatsappHref).toMatch(/wa\.me\/34663475960/));
  });

  describe('photos', () => {
    it('extracts at least 2 photos', () => expect(payload.photos.length).toBeGreaterThanOrEqual(2));
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
    it('extracts video src', () =>
      expect(payload.video?.src).toMatch(/camila105.*\.mp4/));
    it('extracts video poster', () =>
      expect(payload.video?.poster).toMatch(/camila105.*\.jpg/));
  });
});
