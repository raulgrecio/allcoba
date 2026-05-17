import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { MisliosAdapter } from '#infrastructure/adapters/sources/dating/mislios.adapter.js';

describe('MisliosAdapter', () => {
  const adapter = new MisliosAdapter({} as CrawlerPort);

  const html = `
    <html>
      <body>
        <h1 class="msl-profile-name">VALERIA</h1>
        <div class="msl-profile-desc">Una experiencia inolvidable en Madrid.</div>
        <div class="msl-gallery">
          <img src="img1.jpg">
          <img src="img2.jpg">
        </div>
        <a href="tel:600222333">Llamar ahora</a>
        <a rel="next" href="https://mislios.com/anuncios/page/2/">Siguiente</a>
      </body>
    </html>
  `;

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl('https://mislios.com/anuncios/valeria-madrid/')).toBe(true);
    expect(adapter.isProfileUrl('https://mislios.com/anuncios/')).toBe(false);
    expect(adapter.isProfileUrl('https://mislios.com/')).toBe(false);
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle('https://mislios.com/any')).toBe(true);
  });

  it('should extract basic profile info', async () => {
    const $ = cheerio.load(html);
    const url = 'https://mislios.com/anuncios/valeria-madrid/';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const nickname = adapter['extractNickname']($, url);
    const description = adapter['extractDescription']($);
    const phones = await adapter['extractPhones']($);

    expect(id).toBe('valeria-madrid');
    expect(title).toBe('VALERIA');
    expect(nickname).toBe('VALERIA');
    expect(description).toBe('Una experiencia inolvidable en Madrid.');
    expect(phones).toContain('600222333');
  });

  it('should extract attributes correctly', () => {
    const $ = cheerio.load(html);
    const url = 'https://mislios.com/anuncios/valeria-madrid/';
    const attributes = adapter['extractAttributes']($, url);

    expect(attributes.independent).toBe(true);
    expect(attributes.rates).toEqual([]);
    expect(attributes.services).toEqual([]);
  });

  it('should extract next page URL', () => {
    const nextUrl = adapter.extractNextPageUrl(html, 'url');
    expect(nextUrl).toBe('https://mislios.com/anuncios/page/2/');
  });

  it('should handle missing elements gracefully', () => {
    const $ = cheerio.load('<html><body></body></html>');
    expect(adapter['extractDescription']($)).toBe('');
    expect(adapter['extractNextPageUrl']('<html></html>', 'url')).toBeUndefined();
  });
});
