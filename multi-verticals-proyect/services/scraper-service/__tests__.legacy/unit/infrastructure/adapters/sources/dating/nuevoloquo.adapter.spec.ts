import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { NuevoloquoAdapter } from '#infrastructure/adapters/sources/dating/nuevoloquo.adapter.js';

describe('NuevoloquoAdapter', () => {
  const adapter = new NuevoloquoAdapter({} as CrawlerPort);

  const html = `
    <html>
      <body>
        <h2 class="public-title">Valentina</h2>
        <div id="description-container"><p>Escort de lujo en Madrid.</p></div>
        <div class="card-zone"><div class="location"><a>Madrid</a></div></div>
        <div class="details-box">
          <span class="legend">Edad</span>
          <span>24</span>
        </div>
        <div class="details-box">
          <span class="legend">Etnia</span>
          <span>Latina</span>
        </div>
        <div class="details-box">
          <span class="legend">Idiomas</span>
          <span>Español, Inglés</span>
        </div>
        <div class="details-box">
          <span class="legend">Empty</span>
        </div>
        <span class="material-symbols-outlined">verified_user</span>
        <div id="galleryVideo"><video><source src="vid.mp4"></video></div>
        <div class="card details"></div>
        <a rel="next" href="https://nuevoloquo.ch/escort/madrid/page/2/">Next</a>
      </body>
    </html>
  `;

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl('https://nuevoloquo.ch/escort/madrid/sofia/123/')).toBe(true);
    expect(adapter.isProfileUrl('https://nuevoloquo.ch/escort/madrid/')).toBe(false);
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle('https://nuevoloquo.ch/any')).toBe(true);
    expect(adapter.canHandle('https://nuevoloquo.com/any')).toBe(true);
    expect(adapter.canHandle('https://other.com/any')).toBe(false);
  });

  it('should extract basic profile info', async () => {
    const $ = cheerio.load(html);
    const url = 'https://nuevoloquo.ch/escort/madrid/valentina/654321/';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const nickname = adapter['extractNickname']($, url);
    const city = adapter['extractCity']($);

    expect(id).toBe('654321');
    expect(title).toBe('Valentina');
    expect(nickname).toBe('Valentina');
    expect(city).toBe('Madrid');
  });

  it('should fallback for nickname and id', () => {
    const $ = cheerio.load('<html><body><h1 class="ad-name">Sofia</h1></body></html>');
    expect(adapter['extractNickname']($, 'url')).toBe('Sofia');
    expect(adapter['extractId']('https://nuevoloquo.ch/any', cheerio.load(''))).toBe(
      'https://nuevoloquo.ch/any',
    );
  });

  it('should extract attributes correctly', () => {
    const $ = cheerio.load(html);
    const url = 'https://nuevoloquo.ch/escort/madrid/valentina/654321/';
    const attributes = adapter['extractAttributes']($, url);

    expect(attributes.age).toBe(24);
    expect(attributes.ethnicity).toBe('Latina');
    expect(attributes.languages).toContain('Español');
    expect(attributes.languages).toContain('Inglés');
    expect(attributes.verified).toBe(true);
    expect(attributes.videoAvailable).toBe(true);
    expect(attributes.badges).toContain('verified');
    expect(attributes.badges).toContain('video');
  });

  it('should handle missing detail fields', () => {
    const $ = cheerio.load(html);
    expect(adapter['extractDetailField']($, 'Empty')).toBeUndefined();
    expect(adapter['extractDetailField']($, 'NonExistent')).toBeUndefined();
  });

  it('should extract next page URL', () => {
    const nextUrl = adapter.extractNextPageUrl(html, 'https://nuevoloquo.ch/escort/madrid/');
    expect(nextUrl).toBe('https://nuevoloquo.ch/escort/madrid/page/2/');
  });
});
