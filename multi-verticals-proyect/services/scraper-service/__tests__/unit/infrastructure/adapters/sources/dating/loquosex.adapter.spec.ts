import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { LoquosexAdapter } from '#infrastructure/adapters/sources/dating/loquosex.adapter.js';

describe('LoquosexAdapter', () => {
  const adapter = new LoquosexAdapter({} as CrawlerPort);

  const html = `
    <html>
      <body>
        <article><h1>Maria, Escort de lujo 600777888</h1></article>
        <div class="anuntis">Una escort muy profesional.</div>
        <div class="numero-telefono">600 777 888</div>
        <div class="precio-minimo">100 €</div>
        <ul class="caracteristicas-detalle-v9">
          <li>Localidad: <a>Comunidad</a> <a>Madrid</a> <a>Madrid Capital</a> <a>Chamartín</a></li>
          <li>Edad: 26 años</li>
          <li>Nacionalidad: Española</li>
          <li>Categoría: <a>Escort</a></li>
        </ul>
        <p class="cabecera-titulo">Anuncio PREMIUM</p>
        <ul class="si-no-1">
          <li><img alt="Masaje SI"></li>
        </ul>
        <ul class="servicios-1">
          <li>Masaje</li>
        </ul>
        <a class="nextpostslink" href="https://loquosex.com/escorts-madrid/page/2/">Next</a>
      </body>
    </html>
  `;

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl('https://loquosex.com/sofia-123.html')).toBe(true);
    expect(adapter.isProfileUrl('https://loquosex.com/escorts-madrid/page/2/')).toBe(false);
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle('https://loquosex.com/any')).toBe(true);
  });

  it('should extract basic profile info', async () => {
    const $ = cheerio.load(html);
    const url = 'https://loquosex.com/maria-600777888.html';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const nickname = adapter['extractNickname']($, url);
    const city = adapter['extractCity']($);
    const zone = adapter['extractZone']($);
    const phones = await adapter['extractPhones']($);
    const price = adapter['extractPrice']($);

    expect(id).toBe('600777888');
    expect(title).toContain('Maria');
    expect(nickname).toBe('Maria');
    expect(city).toBe('Madrid Capital');
    expect(zone).toBe('Chamartín');
    expect(phones).toContain('600777888');
    expect(price).toBe(100);
  });

  it('should fallback for city and id', () => {
    const $ = cheerio.load(
      '<ul class="caracteristicas-detalle"><li>Localidad: <a>Region</a> <a>Province</a></li></ul>',
    );
    expect(adapter['extractCity']($)).toBe('Province');
    expect(adapter['extractId']('https://loquosex.com/no-phone.html', cheerio.load(''))).toBe(
      'no-phone.html',
    );
  });

  it('should fallback for phone', async () => {
    const $ = cheerio.load('<a href="tel:611222333">Call</a>');
    expect(await adapter['extractPhones']($)).toContain('611222333');
  });

  it('should extract attributes correctly', () => {
    const $ = cheerio.load(html);
    const url = 'https://loquosex.com/maria-600777888.html';
    const attributes = adapter['extractAttributes']($, url);

    expect(attributes.nickname).toBe('Maria');
    expect(attributes.badges).toContain('premium');
  });

  it('should handle missing premium title', () => {
    const $ = cheerio.load('<html><body><article><h1>Sofia</h1></article></body></html>');
    const attributes = adapter['extractAttributes']($, 'url');
    expect(attributes.badges).not.toContain('premium');
  });

  it('should extract next page URL', () => {
    const nextUrl = adapter.extractNextPageUrl(html, 'https://loquosex.com/escorts-madrid/');
    expect(nextUrl).toBe('https://loquosex.com/escorts-madrid/page/2/');
  });
});
