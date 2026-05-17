import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { HotValenciaAdapter } from '#infrastructure/adapters/sources/dating/hotvalencia.adapter.js';

describe('HotValenciaAdapter', () => {
  const adapter = new HotValenciaAdapter({} as CrawlerPort);

  const html = `
    <html>
      <body>
        <h1 class="entry-title">Sofia</h1>
        <div class="elementor-text-editor">Una chica muy simpática en Valencia.</div>
        <a href="tel:600333444">Llamar</a>
        <video><source src="vid.mp4"></video>
        <a rel="next" href="https://hotvalencia.com/putas-valencia/page/2/">Siguiente</a>
      </body>
    </html>
  `;

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl('https://hotvalencia.com/putas-valencia/sofia/')).toBe(true);
    expect(adapter.isProfileUrl('https://hotvalencia.com/putas-valencia/')).toBe(false);
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle('https://hotvalencia.com/any')).toBe(true);
    expect(adapter.canHandle('https://other.com/any')).toBe(false);
  });

  it('should extract basic profile info', async () => {
    const $ = cheerio.load(html);
    const url = 'https://hotvalencia.com/putas-valencia/sofia/';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const nickname = adapter['extractNickname']($, url);
    const description = adapter['extractDescription']($);
    const phones = await adapter['extractPhones']($);

    expect(id).toBe('sofia');
    expect(title).toBe('Sofia');
    expect(nickname).toBe('Sofia');
    expect(description).toContain('simpática');
    expect(phones).toContain('600333444');
  });

  it('should extract attributes correctly', () => {
    const $ = cheerio.load(html);
    const url = 'https://hotvalencia.com/putas-valencia/sofia/';
    const attributes = adapter['extractAttributes']($, url);

    expect(attributes.nickname).toBe('Sofia');
    expect(attributes.videoAvailable).toBe(true);
    expect(attributes.badges).toContain('video');
  });

  it('should handle missing optional data', async () => {
    const emptyHtml = '<html><body><h1>No Phone</h1></body></html>';
    const $ = cheerio.load(emptyHtml);
    expect(await adapter['extractPhones']($)).toHaveLength(0);
    const attrs = adapter['extractAttributes']($, 'url');
    expect(attrs.videoAvailable).toBe(false);
    expect(attrs.badges).toHaveLength(0);
  });

  it('should extract next page URL', () => {
    const nextUrl = adapter.extractNextPageUrl(html, 'https://hotvalencia.com/putas-valencia/');
    expect(nextUrl).toBe('https://hotvalencia.com/putas-valencia/page/2/');
  });
});
