import { beforeAll, describe, expect, it } from 'vitest';

import type { GemidosPayload } from '#infrastructure/adapters/sources/dating/gemidos/gemidos.types.js';
import { extractGemidos } from '#infrastructure/adapters/sources/dating/gemidos/gemidos.extractor.js';

import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://gemidos.tv/anuncio/lucia-escort-madrid/';

describe('extractGemidos — fixture lucia_escort-madrid', () => {
  let payload: GemidosPayload;

  beforeAll(() => {
    const html = loadHtml('lucia_escort-madrid.html');
    payload = extractGemidos(html, SOURCE_URL);
  });

  it('sourceId = lucia-escort-madrid', () => expect(payload.sourceId).toBe('lucia-escort-madrid'));
  it('sourceUrl', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  it('title extracted from .pub-title', () => expect(payload.title).toContain('Lucia'));
  it('nickname = Lucia (emoji stripped)', () => expect(payload.nickname).toBe('Lucia'));
  it('bio extracted', () => expect(payload.bio).toContain('independiente'));

  it('phone from .pub-phone span', () => expect(payload.phone).toBe('633445566'));

  it('2 gallery photos', () => expect(payload.photos).toHaveLength(2));
  it('isVerified = true', () => expect(payload.isVerified).toBe(true));

  it('age = 26', () => expect(payload.params.age).toBe(26));
  it('heightCm = 165', () => expect(payload.params.heightCm).toBe(165));
  it('weightKg = 52', () => expect(payload.params.weightKg).toBe(52));
  it('measurements = 90-60-90', () => expect(payload.params.measurements).toBe('90-60-90'));
  it('nationality = Colombiana', () => expect(payload.params.nationality).toBe('Colombiana'));
  it('ethnicity = Morena', () => expect(payload.params.ethnicity).toBe('Morena'));
  it('services extracted', () => {
    expect(payload.params.services).toContain('GFE');
    expect(payload.params.services).toContain('Masaje');
  });
});

describe('extractGemidos — og:image fallback', () => {
  it('uses og:image when no gallery', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.gemidos.tv/og.jpg">
    </head><body><h1 class="pub-title">Sofia</h1></body></html>`;
    const p = extractGemidos(html, 'https://gemidos.tv/anuncio/sofia/');
    expect(p.photos).toHaveLength(1);
    expect(p.photos[0]!.src).toContain('og.jpg');
  });
});

describe('extractGemidos — minimal HTML', () => {
  it('handles missing data gracefully', () => {
    const html = '<html><body><h1 class="pub-title">Mia</h1></body></html>';
    const p = extractGemidos(html, 'https://gemidos.tv/anuncio/mia/');
    expect(p.sourceId).toBe('mia');
    expect(p.phone).toBeUndefined();
    expect(p.isVerified).toBe(false);
    expect(p.params.age).toBeUndefined();
    expect(p.params.services).toBeUndefined();
  });
});
