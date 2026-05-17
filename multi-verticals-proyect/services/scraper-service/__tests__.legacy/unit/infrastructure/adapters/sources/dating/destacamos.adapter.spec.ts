import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { DestacamosAdapter } from '#infrastructure/adapters/sources/dating/destacamos.adapter.js';

describe('DestacamosAdapter', () => {
  const adapter = new DestacamosAdapter({} as CrawlerPort);

  const html = `
    <html>
      <body>
        <h1 class="hh1">Maria</h1>
        <div id="description">
          <p>Una descripción muy detallada.</p>
        </div>
        <div id="details">
          <div><span>Edad</span><br><strong>25</strong></div>
          <div><span>Nacionalidad</span><br><strong>Española</strong></div>
          <div><span>Color de pelo</span><br><strong>Rubio</strong></div>
          <div><span>Altura</span><br><strong>1'70</strong></div>
          <div><span>Idiomas</span><br><strong>Español, Francés</strong></div>
          <div><span>Ciudad</span><br><strong>Barcelona</strong></div>
          <div><span>Zona</span><br><strong>Eixample</strong></div>
          <div><span>Código postal</span><br><strong>08001</strong></div>
        </div>
        <div id="detallesimportantes">
          <a href="tel:611222333">Llamar</a>
        </div>
        <div class="premiumdet">Premium</div>
        <div class="topdet">TOP</div>
      </body>
    </html>
  `;

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl('https://destacamos.net/12345-maria-details.html')).toBe(true);
    expect(adapter.isProfileUrl('https://destacamos.net/list.html')).toBe(false);
  });

  it('should extract basic profile info', async () => {
    const $ = cheerio.load(html);
    const url = 'https://destacamos.net/12345-maria-details.html';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const description = adapter['extractDescription']($);

    expect(id).toBe('12345');
    expect(title).toBe('Maria');
    expect(description).toBe('Una descripción muy detallada.');
  });

  it('should extract alternate ID formats', () => {
    expect(adapter['extractId']('https://destacamos.net/opiniones/67890', cheerio.load(''))).toBe(
      '67890',
    );
    expect(adapter['extractId']('https://destacamos.net/just-a-slug', cheerio.load(''))).toBe(
      'just-a-slug',
    );
  });

  it('should extract attributes correctly', () => {
    const $ = cheerio.load(html);
    const url = 'https://destacamos.net/12345-maria-details.html';
    const attributes = adapter['extractAttributes']($, url);
    const zone = adapter['extractZone']($);
    const postalCode = adapter['extractPostalCode']($);

    expect(attributes.nickname).toBe('Maria');
    expect(attributes.age).toBe(25);
    expect(attributes.hairColor).toBe('Rubio');
    expect(attributes.heightCm).toBe(170);
    expect(attributes.nationality).toBe('Española');
    expect(attributes.languages).toContain('Francés');
    expect(attributes.badges).toContain('premium');
    expect(attributes.badges).toContain('top');
    expect(zone).toBe('Eixample');
    expect(postalCode).toBe('08001');
  });

  it('should handle missing detail fields', () => {
    const $ = cheerio.load(html);
    expect(adapter['extractDetailField']($, 'NonExistent')).toBeUndefined();
    expect(adapter['parseHeightCm'](undefined)).toBeUndefined();
    expect(adapter['parseHeightCm']('invalid format')).toBeUndefined();
  });
});
