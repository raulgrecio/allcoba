import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { GemidosAdapter } from '#infrastructure/adapters/sources/dating/gemidos.adapter.js';

describe('GemidosAdapter', () => {
  const adapter = new GemidosAdapter({} as CrawlerPort);

  const html = `
    <html>
      <body>
        <h1 class="pub-title">🔥 Sofia, espectacular acompañante</h1>
        <div class="pub-about-full">Una descripción muy hot.</div>
        <div class="pub-phone"><span>600 555 444</span></div>
        <div class="pub-tags">
          <div class="pub-tags-item number">22 Años</div>
          <div class="pub-tags-item number">170 CM</div>
          <div class="pub-tags-item number">50 KG</div>
          <div class="pub-tags-item number">90-60-90</div>
          <div class="pub-tags-item"><small>Nacionalidad</small>Rusa</div>
          <div class="pub-tags-item"><small>Piel</small>Blanca</div>
        </div>
        <div class="pub-services">
          <div class="pub-tags-item">Besos</div>
          <div class="pub-tags-item">Oral</div>
        </div>
        <i class="fa-shield-check"></i>
        <a rel="next" href="https://gemidos.tv/espana/page/2/">Next</a>
      </body>
    </html>
  `;

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl('https://gemidos.tv/anuncio/sofia-espectacular/')).toBe(true);
    expect(adapter.isProfileUrl('https://gemidos.tv/espana/')).toBe(false);
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle('https://gemidos.tv/any')).toBe(true);
  });

  it('should extract basic profile info', async () => {
    const $ = cheerio.load(html);
    const url = 'https://gemidos.tv/anuncio/sofia-espectacular/';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const nickname = adapter['extractNickname']($, url);
    const phones = await adapter['extractPhones']($);

    expect(id).toBe('sofia-espectacular');
    expect(title).toContain('Sofia');
    expect(nickname).toBe('Sofia');
    expect(phones).toContain('600555444');
  });

  it('should extract attributes correctly', () => {
    const $ = cheerio.load(html);
    const url = 'https://gemidos.tv/anuncio/sofia-espectacular/';
    const attributes = adapter['extractAttributes']($, url);

    expect(attributes.nickname).toBe('Sofia');
    expect(attributes.age).toBe(22);
    expect(attributes.heightCm).toBe(170);
    expect(attributes.weightKg).toBe(50);
    expect(attributes.nationality).toBe('Rusa');
    expect(attributes.ethnicity).toBe('Blanca');
    expect(attributes.measurements).toBe('90-60-90');
    expect(attributes.verified).toBe(true);
    expect(attributes.badges).toContain('verified');
  });

  it('should handle missing tags and attributes', () => {
    const $ = cheerio.load('<html><body><h1 class="pub-title">Sofia</h1></body></html>');
    const attributes = adapter['extractAttributes']($, 'https://gemidos.tv/anuncio/sofia/');
    expect(attributes.age).toBeUndefined();
    expect(attributes.nationality).toBeUndefined();
  });

  it('should handle nickname edge cases', () => {
    const $ = cheerio.load('<h1 class="pub-title">⭐️ Elena</h1>');
    expect(adapter['extractNickname']($, '')).toBe('Elena');
    const $2 = cheerio.load('<h1 class="pub-title">Elena</h1>');
    expect(adapter['extractNickname']($2, '')).toBe('Elena');
  });

  it('should extract next page URL', () => {
    const nextUrl = adapter.extractNextPageUrl(html, 'url');
    expect(nextUrl).toBe('https://gemidos.tv/espana/page/2/');
  });
});
