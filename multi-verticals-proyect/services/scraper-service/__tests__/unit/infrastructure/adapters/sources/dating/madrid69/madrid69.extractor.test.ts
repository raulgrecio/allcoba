import { describe, expect, it, beforeAll } from 'vitest';
import { extractMadrid69 } from '#infrastructure/adapters/sources/dating/madrid69/madrid69.extractor.js';
import type { Madrid69Payload } from '#infrastructure/adapters/sources/dating/madrid69/madrid69.types.js';
import { loadHtml, loadJson } from './helpers/load-fixtures.js';

const SOURCE_URL =
  'https://www.madrid69.com/citas-chicas-madrid-44064-thalia-pura-ternura-644417235';

describe('extractMadrid69 — fixture kheila_44064 (head-only)', () => {
  let payload: Madrid69Payload;

  beforeAll(() => {
    const html = loadHtml('kheila_44064.html');
    payload = extractMadrid69(html, SOURCE_URL);
  });

  it('sourceId = 44064', () => expect(payload.sourceId).toBe('44064'));
  it('sourceUrl preserved', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  it('title extracted from <title>', () => expect(payload.title).toContain('Kheila'));
  it('nickname = Kheila', () => expect(payload.nickname).toBe('Kheila'));
  it('bio from meta description', () =>
    expect(payload.bio).toContain('Soy Kheila'));
  it('phone from title "tel: 644417235"', () => expect(payload.phone).toBe('644417235'));
  it('city = madrid (from URL)', () => expect(payload.city).toBe('madrid'));
  it('2 CDN profile photos', () => expect(payload.photos).toHaveLength(2));
  it('photo src contains CDN domain', () =>
    expect(payload.photos[0]!.src).toContain('madrid69.b-cdn.net'));
  it('isVerified = false (head default)', () => expect(payload.isVerified).toBe(false));
  it('isVip = false (head default)', () => expect(payload.isVip).toBe(false));
  it('age = undefined (head-only)', () => expect(payload.age).toBeUndefined());
});

describe('extractMadrid69 — CDN deduplication', () => {
  it('deduplicates preloaded images with different query strings', () => {
    const html = `<html><head>
      <link rel="preload" as="image" href="https://madrid69.b-cdn.net/image/abc/photo1.jpg?width=550&aspect_ratio=10:16">
      <link rel="preload" as="image" href="https://madrid69.b-cdn.net/image/abc/photo1.jpg?width=300&quality=80">
      <link rel="preload" as="image" href="https://madrid69.b-cdn.net/image/abc/photo2.jpg?width=550">
    </head><body></body></html>`;
    const p = extractMadrid69(html, SOURCE_URL);
    expect(p.photos).toHaveLength(2);
  });
});

describe('extractMadrid69 — og:image fallback', () => {
  it('uses og:image when no CDN preload images', () => {
    const html = `<html><head>
      <title>Sofia - tel: 611223344 | Madrid69</title>
      <meta property="og:image" content="https://madrid69.b-cdn.net/image/abc/sofia.jpg?face_crop=1200,630">
    </head><body></body></html>`;
    const p = extractMadrid69(
      html,
      'https://www.madrid69.com/citas-chicas-madrid-99999-sofia-611223344',
    );
    expect(p.photos).toHaveLength(1);
    expect(p.photos[0]!.src).toContain('sofia.jpg');
  });
});

describe('extractMadrid69 — non-CDN preloads ignored', () => {
  it('ignores flag images and font preloads', () => {
    const html = `<html><head>
      <link rel="preload" as="image" href="https://flagcdn.com/32x24/co.png">
      <link rel="preload" as="font" href="/_next/static/media/font.woff2">
      <link rel="preload" as="image" href="/assets/icons/phone.svg">
    </head><body></body></html>`;
    const p = extractMadrid69(html, SOURCE_URL);
    expect(p.photos).toHaveLength(0);
  });
});

describe('extractMadrid69 — with API JSON enrichment', () => {
  let payload: Madrid69Payload;

  beforeAll(() => {
    const html = loadHtml('kheila_44064.html');
    const apiJson = loadJson('kheila_44064.json');
    payload = extractMadrid69(html, SOURCE_URL, apiJson);
  });

  it('API nickname overrides head', () => expect(payload.nickname).toBe('Kheila'));
  it('API phone normalized', () => expect(payload.phone).toBe('644417235'));
  it('API whatsappPhone normalized', () => expect(payload.whatsappPhone).toBe('644417235'));
  it('API city = Madrid', () => expect(payload.city).toBe('Madrid'));
  it('API age = 25', () => expect(payload.age).toBe(25));
  it('API heightCm = 168', () => expect(payload.heightCm).toBe(168));
  it('API weightKg = 58', () => expect(payload.weightKg).toBe(58));
  it('API nationality = Colombia', () => expect(payload.nationality).toBe('Colombia'));
  it('API languages', () => expect(payload.languages).toEqual(['Español', 'Inglés']));
  it('API photos from fotos (2 items)', () => {
    expect(payload.photos).toHaveLength(2);
    expect(payload.photos[0]!.src).toContain('api.madrid69.com/storage');
  });
  it('API services', () => expect(payload.services).toContain('Besos'));
});

describe('extractMadrid69 — minimal HTML', () => {
  it('handles missing title and body gracefully', () => {
    const html = '<html><head></head><body></body></html>';
    const p = extractMadrid69(html, SOURCE_URL);
    expect(p.sourceId).toBe('44064');
    expect(p.nickname).toBeUndefined();
    expect(p.phone).toBeUndefined();
    expect(p.photos).toHaveLength(0);
  });
});
