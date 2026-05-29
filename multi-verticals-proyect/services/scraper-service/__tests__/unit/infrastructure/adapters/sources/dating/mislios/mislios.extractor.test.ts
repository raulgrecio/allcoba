import { beforeAll, describe, expect, it } from 'vitest';

import type { MisliosPayload } from '#infrastructure/adapters/sources/dating/mislios/mislios.types.js';
import { extractMislios } from '#infrastructure/adapters/sources/dating/mislios/mislios.extractor.js';

import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://mislios.com/anuncios/ana-escort-madrid/';

describe('extractMislios — fixture ana_escort-madrid', () => {
  let payload: MisliosPayload;

  beforeAll(() => {
    const html = loadHtml('ana_escort-madrid.html');
    payload = extractMislios(html, SOURCE_URL);
  });

  it('sourceId = ana-escort-madrid', () => expect(payload.sourceId).toBe('ana-escort-madrid'));
  it('sourceUrl', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  it('title extracted from h1', () => expect(payload.title).toContain('Ana'));
  it('nickname = Ana', () => expect(payload.nickname).toBe('Ana'));
  it('bio extracted', () => expect(payload.bio).toContain('independiente'));

  it('phone extracted from tel: href', () => expect(payload.phone).toBe('622345678'));

  it('3 gallery photos', () => expect(payload.photos).toHaveLength(3));
  it('photo src is https', () => {
    for (const p of payload.photos) expect(p.src).toMatch(/^https?:/);
  });
});

describe('extractMislios — og:image fallback', () => {
  it('uses og:image when no gallery', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.mislios.com/og.jpg">
    </head><body><h1>Sofia</h1></body></html>`;
    const p = extractMislios(html, 'https://mislios.com/anuncios/sofia/');
    expect(p.photos).toHaveLength(1);
    expect(p.photos[0]!.src).toContain('og.jpg');
  });
});

describe('extractMislios — msl-profile-name fallback', () => {
  it('uses .msl-profile-name when no h1', () => {
    const html = `<html><body>
      <span class="msl-profile-name">Elena Barcelona</span>
    </body></html>`;
    const p = extractMislios(html, 'https://mislios.com/anuncios/elena/');
    expect(p.title).toContain('Elena');
    expect(p.nickname).toBe('Elena');
  });
});

describe('extractMislios — minimal HTML', () => {
  it('handles missing phone and photos gracefully', () => {
    const html = '<html><body><h1>Carla</h1><div class="msl-profile-desc">Hola</div></body></html>';
    const p = extractMislios(html, 'https://mislios.com/anuncios/carla/');
    expect(p.sourceId).toBe('carla');
    expect(p.phone).toBeUndefined();
    expect(p.photos).toHaveLength(0);
  });
});
