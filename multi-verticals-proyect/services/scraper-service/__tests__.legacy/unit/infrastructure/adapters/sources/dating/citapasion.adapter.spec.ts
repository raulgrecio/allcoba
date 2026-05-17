import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { CitapasionAdapter } from '#infrastructure/adapters/sources/dating/citapasion.adapter.js';

describe('CitapasionAdapter', () => {
  const adapter = new CitapasionAdapter({} as CrawlerPort);

  const html = `
    <html>
      <body>
        <h1>Camila | Escort Madrid</h1>
        <div class="card-perfil sobre__mi">
          <div class="text__description">Una descripción apasionada.</div>
        </div>
        <div class="card-perfil datos_interes">
          <ul>
            <li><span>Nombre:</span> Camila</li>
            <li><span>Edad:</span> 28</li>
            <li><span>Altura:</span> 168</li>
            <li><span>Peso:</span> 60</li>
            <li><span>Color de pelo:</span> Castaño</li>
            <li><span>Tatuajes:</span> SI</li>
            <li><span>Piercings:</span> NO</li>
            <li><span>Fumador@:</span> SI</li>
            <li><span>Zona:</span> Centro</li>
            <li><span>Empty:</span> </li>
          </ul>
          <div class="idiomas__content">
            <div class="item"><p>Español</p></div>
            <div class="item"><p>Inglés</p></div>
          </div>
        </div>
        <div class="reviews">
          <div class="stars" style="--rating: 4.5"></div>
          <span>(12)</span>
        </div>
        <p data-href="tel:+34600333444">Llamar</p>
        <div data-accion="https://wa.me/34600333444">WhatsApp</div>
        <a rel="next" href="https://citapasion.com/escorts/madrid/page/2/">Next</a>
      </body>
    </html>
  `;

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl('https://citapasion.com/escorts/24080')).toBe(true);
    expect(adapter.isProfileUrl('https://citapasion.com/escorts/madrid/getafe/')).toBe(false);
    expect(adapter.isProfileUrl('https://citapasion.com/escorts/24080?param=1')).toBe(false);
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle('https://citapasion.com/any')).toBe(true);
  });

  it('should extract basic profile info', async () => {
    const $ = cheerio.load(html);
    const url = 'https://citapasion.com/escorts/12345';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const description = adapter['extractDescription']($);
    const phones = await adapter['extractPhones']($);
    const whatsapp = adapter['extractWhatsapp']($);

    expect(id).toBe('12345');
    expect(title).toBe('Camila');
    expect(description).toBe('Una descripción apasionada.');
    expect(phones).toContain('34600333444');
    expect(whatsapp).toBe('+34600333444');
  });

  it('should fallback for nickname and title', () => {
    const fallbackHtml = '<html><body><h1>Sofia | Madrid</h1></body></html>';
    const $ = cheerio.load(fallbackHtml);
    expect(adapter['extractNickname']($, 'url')).toBeUndefined();
    expect(adapter['extractTitle']($)).toBe('Sofia');
  });

  it('should use fallbacks for phone and whatsapp', async () => {
    const fallbackHtml = `
      <a href="tel:611222333">Standard Phone</a>
      <a href="https://wa.me/34611222333">Standard WA</a>
    `;
    const $ = cheerio.load(fallbackHtml);
    const phones = await adapter['extractPhones']($);
    const whatsapp = adapter['extractWhatsapp']($);
    expect(phones).toContain('611222333');
    expect(whatsapp).toBe('+34611222333');
  });

  it('should extract attributes correctly', () => {
    const $ = cheerio.load(html);
    const url = 'https://citapasion.com/escorts/12345';
    const attributes = adapter['extractAttributes']($, url);
    const zone = adapter['extractZone']($);

    expect(attributes.nickname).toBe('Camila');
    expect(attributes.age).toBe(28);
    expect(attributes.hairColor).toBe('Castaño');
    expect(attributes.tattoos).toBe(true);
    expect(attributes.piercings).toBe(false);
    expect(attributes.smoker).toBe(true);
    expect(attributes.languages).toContain('Español');
    expect(attributes.siteRating?.score).toBe(4.5);
    expect(attributes.siteRating?.count).toBe(12);
    expect(zone).toBe('Centro');
  });

  it('should handle malformed site rating', () => {
    const $ = cheerio.load(
      '<html><body><div class="stars" style="invalid"></div><span>(0)</span></body></html>',
    );
    expect(adapter['extractSiteRating']($)).toBeUndefined();

    const $2 = cheerio.load(
      '<html><body><div class="reviews"><div class="stars" style="--rating: 5"></div><span>invalid</span></div></body></html>',
    );
    const rating = adapter['extractSiteRating']($2);
    expect(rating?.score).toBe(5);
    expect(rating?.count).toBe(0);
  });

  it('should return undefined for missing data rows', () => {
    const $ = cheerio.load(html);
    expect(adapter['extractDataRow']($, 'NonExistent')).toBeUndefined();
    expect(adapter['extractDataRow']($, 'Empty')).toBeUndefined();
  });

  it('should extract next page URL', () => {
    const nextUrl = adapter.extractNextPageUrl(html, 'url');
    expect(nextUrl).toBe('https://citapasion.com/escorts/madrid/page/2/');
  });
});
