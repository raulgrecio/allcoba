import { beforeAll, describe, expect, it } from 'vitest';

import type { NuevoloquoPayload } from '#infrastructure/adapters/sources/dating/nuevoloquo/nuevoloquo.types.js';
import { extractNuevoloquo } from '#infrastructure/adapters/sources/dating/nuevoloquo/nuevoloquo.extractor.js';

import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://nuevoloquo.es/escort/madrid/ana-martinez/67890/';

describe('extractNuevoloquo — fixture ana_67890', () => {
  let payload: NuevoloquoPayload;

  beforeAll(() => {
    const html = loadHtml('ana_67890.html');
    payload = extractNuevoloquo(html, SOURCE_URL);
  });

  it('sourceId = 67890', () => expect(payload.sourceId).toBe('67890'));
  it('sourceUrl', () => expect(payload.sourceUrl).toBe(SOURCE_URL));

  it('title extracted', () => expect(payload.title).toContain('Ana'));
  it('nickname is first word of title', () => expect(payload.nickname).toBe('Ana'));
  it('bio extracted', () => expect(payload.bio).toContain('sensual'));

  it('age = 27', () => expect(payload.params.age).toBe('27'));
  it('gender = Mujer', () => expect(payload.params.gender).toBe('Mujer'));
  it('ethnicity = Latina', () => expect(payload.params.ethnicity).toBe('Latina'));
  it('hairColor = Morena', () => expect(payload.params.hairColor).toBe('Morena'));
  it('weightKg = 55', () => expect(payload.params.weightKg).toBe('55'));
  it('heightCm = 165', () => expect(payload.params.heightCm).toBe('165'));
  it('measurements = 90-60-90', () => expect(payload.params.measurements).toBe('90-60-90'));
  it('serviceType = Hombre', () => expect(payload.params.serviceType).toBe('Hombre'));
  it('languages includes Español', () => expect(payload.params.languages).toContain('Español'));
  it('languages includes Inglés', () => expect(payload.params.languages).toContain('Inglés'));
  it('locationCity = Madrid', () => expect(payload.params.locationCity).toBe('Madrid'));

  it('3 photos', () => expect(payload.photos).toHaveLength(3));
  it('photo urls are https', () => {
    for (const p of payload.photos) expect(p.src).toMatch(/^https?:/);
  });

  it('isVerified = true', () => expect(payload.isVerified).toBe(true));
  it('hasVideo = false', () => expect(payload.hasVideo).toBe(false));
});

describe('extractNuevoloquo — minimal HTML', () => {
  it('handles missing details gracefully', () => {
    const html = '<html><body><h2 class="public-title">Sofia</h2></body></html>';
    const p = extractNuevoloquo(html, 'https://nuevoloquo.es/escort/madrid/sofia/99999/');
    expect(p.sourceId).toBe('99999');
    expect(p.title).toBe('Sofia');
    expect(p.photos).toHaveLength(0);
    expect(p.isVerified).toBe(false);
    expect(p.params.age).toBeUndefined();
  });
});
