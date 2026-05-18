import { describe, expect, it, beforeAll } from 'vitest';
import { extractChicasmalas } from '#infrastructure/adapters/sources/dating/chicasmalas/chicasmalas.extractor.js';
import type { ChicasmalasPayload } from '#infrastructure/adapters/sources/dating/chicasmalas/chicasmalas.types.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL =
  'https://www.chicasmalas.es/maria-escort-espanola-en-orihuela-697394223/';

describe('extractChicasmalas — fixture maria_697394223 (Playwright-rendered)', () => {
  let payload: ChicasmalasPayload;

  beforeAll(() => {
    const html = loadHtml('maria_697394223.html');
    payload = extractChicasmalas(html, SOURCE_URL);
  });

  it('sourceId = URL slug', () =>
    expect(payload.sourceId).toBe('maria-escort-espanola-en-orihuela-697394223'));
  it('sourceUrl preserved', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  it('title from og:title', () => expect(payload.title).toContain('María'));
  it('nickname = María', () => expect(payload.nickname).toBe('María'));
  it('bio from .jkit-tabs .tab-description', () =>
    expect(payload.bio).toBeTruthy());
  it('bio mentions María', () =>
    expect(payload.bio).toContain('María'));
  it('phone from tel: link', () => expect(payload.phone).toBe('697394223'));
  it('whatsappPhone from wa link', () => expect(payload.whatsappPhone).toBe('697394223'));
  it('photos from e-gallery-item links', () => expect(payload.photos.length).toBeGreaterThan(0));
  it('photos are wp-content/uploads URLs', () =>
    expect(payload.photos[0]!.src).toContain('wp-content/uploads'));
  it('city from Google Maps iframe', () => expect(payload.city).toBe('orihuela'));
  it('isVerified = false', () => expect(payload.isVerified).toBe(false));
});

describe('extractChicasmalas — fallback og:image', () => {
  it('uses og:image when no gallery items', () => {
    const html = `<html><head>
      <meta property="og:title" content="Sofia Escort Madrid">
      <meta property="og:image" content="https://www.chicasmalas.es/wp-content/uploads/sofia.jpg">
    </head><body></body></html>`;
    const p = extractChicasmalas(html, 'https://www.chicasmalas.es/sofia-escort-madrid-611223344/');
    expect(p.photos).toHaveLength(1);
    expect(p.photos[0]!.src).toContain('sofia.jpg');
  });
});

describe('extractChicasmalas — phone fallback from slug', () => {
  it('falls back to phone from slug when no tel: link in body', () => {
    const html = '<html><head><meta property="og:title" content="Ana Escort Alicante"></head><body></body></html>';
    const p = extractChicasmalas(html, 'https://www.chicasmalas.es/ana-escort-alicante-699111222/');
    expect(p.phone).toBe('699111222');
    expect(p.city).toBe('alicante');
  });
});

describe('extractChicasmalas — minimal HTML', () => {
  it('handles empty body gracefully', () => {
    const html = '<html><head></head><body></body></html>';
    const p = extractChicasmalas(html, SOURCE_URL);
    expect(p.sourceId).toBe('maria-escort-espanola-en-orihuela-697394223');
    expect(p.photos).toHaveLength(0);
    expect(p.nickname).toBeUndefined();
  });
});
