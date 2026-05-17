import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { MilpasionesAdapter } from '#infrastructure/adapters/sources/dating/milpasiones.adapter.js';

describe('MilpasionesAdapter', () => {
  const adapter = new MilpasionesAdapter({} as CrawlerPort);

  const html = `
    <html>
      <head>
        <meta property="og:title" content="666999000 ELENA LA MÁS CACHONDA">
        <meta property="og:description" content="Una descripción apasionada.">
        <meta name="geo.placename" content="Barcelona">
        <link rel="next" href="https://milpasiones.com/escorts/madrid/?pag=2">
      </head>
      <body>
      </body>
    </html>
  `;

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl('https://milpasiones.com/anuncio/123-abc_456')).toBe(true);
    expect(adapter.isProfileUrl('https://milpasiones.com/escorts/madrid/')).toBe(false);
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle('https://milpasiones.com/any')).toBe(true);
    expect(adapter.canHandle('https://other.com/any')).toBe(false);
  });

  it('should extract basic profile info', async () => {
    const $ = cheerio.load(html);
    const url = 'https://milpasiones.com/anuncio/666999000-elena-cachonda_123456/';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const nickname = adapter['extractNickname']($, url);
    const city = adapter['extractCity']($);
    const phones = await adapter['extractPhones']($, url);

    expect(id).toBe('123456');
    expect(title).toContain('ELENA');
    expect(nickname).toBe('ELENA');
    expect(city).toBe('Barcelona');
    expect(phones).toContain('666999000');
  });

  it('should handle alternate ID and nickname formats', () => {
    expect(
      adapter['extractId']('https://milpasiones.com/anuncio/no-underscore-id', cheerio.load('')),
    ).toBe('no-underscore-id');
    const $ = cheerio.load('<html><head><title>MARIA - Milpasiones</title></head></html>');
    expect(adapter['extractNickname']($, 'url')).toBe('MARIA');
  });

  it('should extract attributes correctly', () => {
    const $ = cheerio.load(html);
    const url = 'https://milpasiones.com/anuncio/666999000-elena-cachonda_123456/';
    const attributes = adapter['extractAttributes']($, url);
    expect(attributes.nickname).toBe('ELENA');
    expect(attributes.independent).toBe(true);
  });

  it('should extract next page URL', () => {
    const nextUrl = adapter.extractNextPageUrl(html, 'https://milpasiones.com/escorts/madrid/');
    expect(nextUrl).toBe('https://milpasiones.com/escorts/madrid/?pag=2');

    // Page calculation fallback
    const calcUrl = adapter.extractNextPageUrl(
      '<html></html>',
      'https://milpasiones.com/escorts/madrid/?pag=2',
    );
    expect(calcUrl).toBe('https://milpasiones.com/escorts/madrid/?pag=3');
  });
});
