import { describe, expect, it, beforeAll } from 'vitest';
import { extractCitapasion } from '#infrastructure/adapters/sources/dating/citapasion/citapasion.extractor.js';
import type { CitapasionPayload } from '#infrastructure/adapters/sources/dating/citapasion/citapasion.types.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://citapasion.com/escorts/17533';

describe('extractCitapasion — fixture sofia_17533', () => {
  let payload: CitapasionPayload;

  beforeAll(() => {
    const html = loadHtml('sofia_17533.html');
    payload = extractCitapasion(html, SOURCE_URL);
  });

  it('sourceId = 17533', () => expect(payload.sourceId).toBe('17533'));
  it('sourceUrl', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  it('title extracted from h1', () => expect(payload.title).toContain('Sofia'));
  it('nickname = Sofia', () => expect(payload.nickname).toBe('Sofia'));
  it('bio extracted', () => expect(payload.bio).toContain('independiente'));

  it('phone from data-href', () => expect(payload.phone).toBe('644556677'));
  it('whatsapp from data-accion', () => expect(payload.whatsappPhone).toBe('644556677'));

  it('2 gallery photos (lightbox href)', () => expect(payload.photos).toHaveLength(2));
  it('photo src is full-size URL', () => {
    expect(payload.photos[0]!.src).toContain('full');
  });

  it('age = 28', () => expect(payload.params.age).toBe(28));
  it('heightCm = 165', () => expect(payload.params.heightCm).toBe(165));
  it('weightKg = 55', () => expect(payload.params.weightKg).toBe(55));
  it('hairColor = Morena', () => expect(payload.params.hairColor).toBe('Morena'));
  it('eyeColor = Marrones', () => expect(payload.params.eyeColor).toBe('Marrones'));
  it('nationality = Colombiana', () => expect(payload.params.nationality).toBe('Colombiana'));
  it('ethnicity = Latina', () => expect(payload.params.ethnicity).toBe('Latina'));
  it('city = Madrid', () => expect(payload.params.city).toBe('Madrid'));
  it('zone = Centro', () => expect(payload.params.zone).toBe('Centro'));
  it('tattoos = false', () => expect(payload.params.tattoos).toBe(false));
  it('piercings = true', () => expect(payload.params.piercings).toBe(true));
  it('smoker = false', () => expect(payload.params.smoker).toBe(false));
  it('languages = [Español, Inglés]', () => {
    expect(payload.params.languages).toEqual(['Español', 'Inglés']);
  });

  it('siteRating score = 4.5', () => expect(payload.siteRating?.score).toBe(4.5));
  it('siteRating count = 12', () => expect(payload.siteRating?.count).toBe(12));
});

describe('extractCitapasion — og:image fallback', () => {
  it('uses og:image when no lightbox gallery', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.citapasion.com/og.jpg">
    </head><body><h1>Elena</h1></body></html>`;
    const p = extractCitapasion(html, 'https://citapasion.com/escorts/99999');
    expect(p.photos).toHaveLength(1);
    expect(p.photos[0]!.src).toContain('og.jpg');
  });
});

describe('extractCitapasion — fallback tel: href', () => {
  it('falls back to a[href^="tel:"] when no data-href', () => {
    const html = `<html><body>
      <h1>Carla</h1>
      <a href="tel:+34655111222">Llamar</a>
    </body></html>`;
    const p = extractCitapasion(html, 'https://citapasion.com/escorts/88888');
    expect(p.phone).toBe('655111222');
  });
});

describe('extractCitapasion — minimal HTML', () => {
  it('handles missing data gracefully', () => {
    const html = '<html><body><h1>Mia</h1></body></html>';
    const p = extractCitapasion(html, 'https://citapasion.com/escorts/11111');
    expect(p.sourceId).toBe('11111');
    expect(p.phone).toBeUndefined();
    expect(p.photos).toHaveLength(0);
    expect(p.params.age).toBeUndefined();
    expect(p.siteRating).toBeUndefined();
  });
});
