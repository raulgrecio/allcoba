import { beforeAll, describe, expect, it } from 'vitest';

import type { NuevapasionPayload } from '#infrastructure/adapters/sources/dating/nuevapasion/nuevapasion.types.js';
import { extractNuevapasion } from '#infrastructure/adapters/sources/dating/nuevapasion/nuevapasion.extractor.js';

import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://nuevapasion.com/anuncio/sofia-abc123';

describe('extractNuevapasion — fixture sofia_abc123', () => {
  let payload: NuevapasionPayload;

  beforeAll(() => {
    const html = loadHtml('sofia_abc123.html');
    payload = extractNuevapasion(html, SOURCE_URL);
  });

  it('sourceId = sofia-abc123', () => expect(payload.sourceId).toBe('sofia-abc123'));
  it('sourceUrl', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  it('title extracted', () => expect(payload.title).toContain('Sofia'));
  it('nickname = Sofia', () => expect(payload.nickname).toBe('Sofia'));
  it('bio extracted', () => expect(payload.bio).toContain('independiente'));

  it('phone extracted from tel: href', () => expect(payload.phone).toBe('655123456'));
  it('whatsappPhone extracted from wa.me', () => expect(payload.whatsappPhone).toBe('655123456'));

  it('2 gallery photos', () => expect(payload.photos).toHaveLength(2));
  it('photo src is https', () => {
    for (const p of payload.photos) expect(p.src).toMatch(/^https?:/);
  });
});

describe('extractNuevapasion — no gallery, og:image fallback', () => {
  it('uses og:image when no gallery', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.nuevapasion.com/og.jpg">
    </head><body><h1>Ana</h1></body></html>`;
    const p = extractNuevapasion(html, 'https://nuevapasion.com/anuncio/ana-xyz');
    expect(p.photos).toHaveLength(1);
    expect(p.photos[0]!.src).toContain('og.jpg');
  });
});

describe('extractNuevapasion — minimal HTML', () => {
  it('handles missing phone and photos gracefully', () => {
    const html = '<html><body><h1>Carla</h1><div class="descripcion">Hola</div></body></html>';
    const p = extractNuevapasion(html, 'https://nuevapasion.com/anuncio/carla-999');
    expect(p.sourceId).toBe('carla-999');
    expect(p.phone).toBeUndefined();
    expect(p.photos).toHaveLength(0);
  });
});
