import { describe, expect, it } from 'vitest';

import { detectTech } from '../../../../../../../src/infrastructure/adapters/sources/_shared/tech/detect-tech.js';

describe('detectTech', () => {
  it('detects WordPress via /wp-content/', () => {
    const html = '<link href="/wp-content/themes/theme/style.css">';
    expect(detectTech(html).wordpress).toBe(true);
  });

  it('detects WordPress via generator meta', () => {
    const html = '<meta name="generator" content="WordPress 6.4.2">';
    const result = detectTech(html);
    expect(result.wordpress).toBe(true);
    expect(result.wpVersion).toBe('6.4.2');
  });

  it('detects Next.js via __NEXT_DATA__', () => {
    const html = '<script id="__NEXT_DATA__" type="application/json">{}</script>';
    expect(detectTech(html).nextjs).toBe(true);
  });

  it('detects Next.js via _next/static', () => {
    const html = '<script src="/_next/static/chunks/main.js"></script>';
    expect(detectTech(html).nextjs).toBe(true);
  });

  it('detects Astro via astro-island', () => {
    const html = '<astro-island uid="abc"></astro-island>';
    expect(detectTech(html).astro).toBe(true);
  });

  it('detects Cloudflare challenge', () => {
    const html = '<form id="cf-browser-verification">';
    expect(detectTech(html).cloudflare).toBe(true);
  });

  it('returns all false for plain HTML', () => {
    const html = '<html><body><p>Hello</p></body></html>';
    const result = detectTech(html);
    expect(result.wordpress).toBe(false);
    expect(result.nextjs).toBe(false);
    expect(result.astro).toBe(false);
    expect(result.cloudflare).toBe(false);
    expect(result.wpVersion).toBeNull();
  });
});
