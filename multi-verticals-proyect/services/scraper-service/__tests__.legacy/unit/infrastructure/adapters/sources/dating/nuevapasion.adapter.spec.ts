import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { NuevapasionAdapter } from '#infrastructure/adapters/sources/dating/nuevapasion.adapter.js';

describe('NuevapasionAdapter', () => {
  const adapter = new NuevapasionAdapter({} as CrawlerPort);

  const html = `
    <html>
      <head><title>Anuncio de Sofia | Nuevapasion</title></head>
      <body>
        <h1 class="ad-title">Sofia, Escort espectacular</h1>
        <div class="descripcion">Chica dulce disponible en Madrid.</div>
        <a href="tel:600999888">Llamar</a>
        <a rel="next" href="https://nuevapasion.com/escorts/madrid/page/2/">Next</a>
      </body>
    </html>
  `;

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl('https://nuevapasion.com/anuncio/sofia-123')).toBe(true);
    expect(adapter.isProfileUrl('https://nuevapasion.com/escorts/madrid/')).toBe(false);
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle('https://nuevapasion.com/any')).toBe(true);
    expect(adapter.canHandle('https://other.com/any')).toBe(false);
  });

  it('should extract basic profile info', async () => {
    const $ = cheerio.load(html);
    const url = 'https://nuevapasion.com/anuncio/sofia-123';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const nickname = adapter['extractNickname']($, url);
    const phones = await adapter['extractPhones']($);

    expect(id).toBe('sofia-123');
    expect(title).toBe('Sofia, Escort espectacular');
    expect(nickname).toBe('Sofia');
    expect(phones).toContain('600999888');
  });

  it('should fallback to title tag if h1 is missing', () => {
    const $ = cheerio.load(
      '<html><head><title>Sofia | Nuevapasion</title></head><body></body></html>',
    );
    expect(adapter['extractTitle']($)).toBe('Sofia');
  });

  it('should extract attributes correctly', () => {
    const $ = cheerio.load(html);
    const url = 'https://nuevapasion.com/anuncio/sofia-123';
    const attributes = adapter['extractAttributes']($, url);
    expect(attributes.nickname).toBe('Sofia');
    expect(attributes.independent).toBe(true);
  });

  it('should extract next page URL', () => {
    const nextUrl = adapter.extractNextPageUrl(html, 'https://nuevapasion.com/escorts/madrid/');
    expect(nextUrl).toBe('https://nuevapasion.com/escorts/madrid/page/2/');
  });
});
