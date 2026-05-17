import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { ErosguiaAdapter } from '#infrastructure/adapters/sources/dating/erosguia.adapter.js';

describe('ErosguiaAdapter', () => {
  const adapter = new ErosguiaAdapter({} as CrawlerPort);

  const html = `
    <html>
      <head>
        <title>Barby, Escort en Barcelona - 664 708 586 - EROSGUIA</title>
      </head>
      <body>
        <div class="ficha-info">
          <div class="grid">
            <div><div class="font-semibold">Nacionalidad</div><div>Brasileña</div></div>
            <div><div class="font-semibold">Edad</div><div>24 años</div></div>
            <div><div class="font-semibold">Estatura</div><div>165 cm</div></div>
            <div><div class="font-semibold">Ciudad</div><div>Barcelona</div></div>
            <div><div class="font-semibold">Empty</div></div>
          </div>
        </div>
        <div class="ficha-about">
          <div x-ref="content">Una chica muy simpática.</div>
        </div>
        <div class="ficha-services-container">
          <div class="ficha-services">
            <div>Masaje Erótico</div>
            <div>Francés Natural</div>
          </div>
        </div>
        <a href="https://wa.me/34664708586">WhatsApp</a>
        <a rel="next" href="https://erosguia.com/escorts-madrid/page/2/">Next</a>
      </body>
    </html>
  `;

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl('https://erosguia.com/12345.html')).toBe(true);
    expect(adapter.isProfileUrl('https://erosguia.com/escorts-madrid/')).toBe(false);
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle('https://erosguia.com/any')).toBe(true);
  });

  it('should extract basic profile info', async () => {
    const $ = cheerio.load(html);
    const url = 'https://erosguia.com/escorts-madrid/12345.html';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const nickname = adapter['extractNickname']($, url);
    const description = adapter['extractDescription']($);
    const phones = await adapter['extractPhones']($);
    const city = adapter['extractCity']($);

    expect(id).toBe('12345');
    expect(title).toContain('Barby');
    expect(nickname).toBe('Barby');
    expect(description).toBe('Una chica muy simpática.');
    expect(phones).toContain('664708586');
    expect(city).toBe('Barcelona');
  });

  it('should fallback for id and city', () => {
    expect(adapter['extractId']('https://erosguia.com/no-match', cheerio.load(''))).toBe(
      'https://erosguia.com/no-match',
    );
    const $ = cheerio.load('<html><head><title>Escort en Madrid - EROSGUIA</title></head></html>');
    expect(adapter['extractCity']($)).toBe('Madrid');
  });

  it('should extract phones from WhatsApp link', async () => {
    const $ = cheerio.load(
      '<html><head><title>Title</title></head><body><a href="https://wa.me/34611222333">WA</a></body></html>',
    );
    expect(await adapter['extractPhones']($)).toContain('611222333');
  });

  it('should extract attributes correctly', () => {
    const $ = cheerio.load(html);
    const url = 'https://erosguia.com/escorts-madrid/12345.html';
    const attributes = adapter['extractAttributes']($, url);

    expect(attributes.nickname).toBe('Barby');
    expect(attributes.age).toBe(24);
    expect(attributes.heightCm).toBe(165);
    expect(attributes.services).toHaveLength(2);
  });

  it('should handle missing ficha fields', () => {
    const $ = cheerio.load(html);
    expect(adapter['extractFichaField']($, 'Empty')).toBeUndefined();
    expect(adapter['extractFichaField']($, 'NonExistent')).toBeUndefined();
  });

  it('should extract next page URL', () => {
    const nextUrl = adapter.extractNextPageUrl(html, 'https://erosguia.com/escorts-madrid/');
    expect(nextUrl).toBe('https://erosguia.com/escorts-madrid/page/2/');
  });
});
