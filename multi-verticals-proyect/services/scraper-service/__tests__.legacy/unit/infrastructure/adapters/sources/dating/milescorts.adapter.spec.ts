import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { MilescortsAdapter } from '#infrastructure/adapters/sources/dating/milescorts.adapter.js';

describe('MilescortsAdapter', () => {
  const adapter = new MilescortsAdapter({} as CrawlerPort);

  const html = `
    <html>
      <body>
        <h1 id="anuncio-titular">Sofia, Escort sexy en tu zona</h1>
        <section class="datos-model">
          <p>Una chica encantadora en Madrid.</p>
        </section>
        <ol class="breadcrumb">
          <li>Home</li>
          <li>Madrid</li>
          <li>Madrid Ciudad</li>
        </ol>
        <a class="label-success">Verificada</a>
        <a href="tel:600111222">Llamar</a>
        <a rel="next" href="https://milescorts.es/escorts-y-putas/madrid/page2.html">Next</a>
      </body>
    </html>
  `;

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl('https://milescorts.es/escorts-y-putas/madrid/sofia-123.htm')).toBe(
      true,
    );
    expect(adapter.isProfileUrl('https://milescorts.es/escorts-y-putas/madrid/')).toBe(false);
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle('https://milescorts.es/any')).toBe(true);
    expect(adapter.canHandle('https://other.com/any')).toBe(false);
  });

  it('should extract basic profile info', async () => {
    const $ = cheerio.load(html);
    const url =
      'https://milescorts.es/escorts-y-putas/madrid-ciudad/600111222-escort-sexy-en-tu-zona-123456.htm';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const nickname = adapter['extractNickname']($, url);
    const city = adapter['extractCity']($, url);
    const phones = await adapter['extractPhones']($, url);

    expect(id).toBe('123456');
    expect(title).toBe('Sofia, Escort sexy en tu zona');
    expect(nickname).toBe('Sofia');
    expect(city).toBe('madrid ciudad');
    expect(phones).toContain('600111222');
  });

  it('should fallback to breadcrumb for city', () => {
    const $ = cheerio.load(html);
    expect(adapter['extractCity']($, undefined)).toBe('Madrid Ciudad');
  });

  it('should fallback for id and phone', async () => {
    expect(adapter['extractId']('https://milescorts.es/anuncio.htm', cheerio.load(''))).toBe(
      'anuncio.htm',
    );
    const $ = cheerio.load('<a href="tel:611222333">Call</a>');
    expect(await adapter['extractPhones']($, undefined)).toContain('611222333');
  });

  it('should extract attributes correctly', () => {
    const $ = cheerio.load(html);
    const url =
      'https://milescorts.es/escorts-y-putas/madrid-ciudad/600111222-escort-sexy-en-tu-zona-123456.htm';
    const attributes = adapter['extractAttributes']($, url);

    expect(attributes.nickname).toBe('Sofia');
    expect(attributes.verified).toBe(true);
    expect(attributes.badges).toContain('verified');
  });

  it('should extract next page URL', () => {
    const nextUrl = adapter.extractNextPageUrl(
      html,
      'https://milescorts.es/escorts-y-putas/madrid/',
    );
    expect(nextUrl).toBe('https://milescorts.es/escorts-y-putas/madrid/page2.html');
  });
});
