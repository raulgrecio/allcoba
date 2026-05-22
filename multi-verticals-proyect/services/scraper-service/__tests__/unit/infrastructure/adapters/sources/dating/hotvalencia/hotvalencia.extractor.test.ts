import { beforeAll, describe, expect, it } from 'vitest';

import type { HotvalenciaPayload } from '#infrastructure/adapters/sources/dating/hotvalencia/hotvalencia.types.js';
import { extractHotvalencia } from '#infrastructure/adapters/sources/dating/hotvalencia/hotvalencia.extractor.js';

import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://hotvalencia.com/putas-valencia/valentina-escortvalencia/';

describe('extractHotvalencia — fixture valentina_escortvalencia', () => {
  let payload: HotvalenciaPayload;

  beforeAll(() => {
    const html = loadHtml('valentina_escortvalencia.html');
    payload = extractHotvalencia(html, SOURCE_URL);
  });

  it('sourceId = valentina-escortvalencia', () =>
    expect(payload.sourceId).toBe('valentina-escortvalencia'));
  it('sourceUrl', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  it('title extracted from h1.entry-title', () => expect(payload.title).toContain('Valentina'));
  it('nickname = Valentina', () => expect(payload.nickname).toBe('Valentina'));
  it('bio extracted from .elementor-text-editor', () =>
    expect(payload.bio).toContain('independiente'));
  it('phone from tel: href', () => expect(payload.phone).toBe('611223344'));
  it('2 gallery photos', () => expect(payload.photos).toHaveLength(2));
  it('hasVideo = false', () => expect(payload.hasVideo).toBe(false));
});

describe('extractHotvalencia — hasVideo', () => {
  it('detects video tag', () => {
    const html = `<html><body>
      <h1>Sofia</h1>
      <video src="https://cdn.hotvalencia.com/video.mp4"></video>
    </body></html>`;
    const p = extractHotvalencia(html, 'https://hotvalencia.com/putas-valencia/sofia/');
    expect(p.hasVideo).toBe(true);
  });
});

describe('extractHotvalencia — og:image fallback', () => {
  it('uses og:image when no .elementor-image', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.hotvalencia.com/og.jpg">
    </head><body><h1>Carla</h1></body></html>`;
    const p = extractHotvalencia(html, 'https://hotvalencia.com/putas-valencia/carla/');
    expect(p.photos).toHaveLength(1);
    expect(p.photos[0]!.src).toContain('og.jpg');
  });
});

describe('extractHotvalencia — minimal HTML', () => {
  it('handles missing data gracefully', () => {
    const html = '<html><body><h1>Mia</h1></body></html>';
    const p = extractHotvalencia(html, 'https://hotvalencia.com/putas-valencia/mia/');
    expect(p.sourceId).toBe('mia');
    expect(p.phone).toBeUndefined();
    expect(p.photos).toHaveLength(0);
  });
});
