import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { GirlsMadridAdapter } from '#infrastructure/adapters/sources/dating/girlsmadrid.adapter.js';

describe('GirlsMadridAdapter', () => {
  const adapter = new GirlsMadridAdapter({} as CrawlerPort);
  const baseUrl = 'https://www.girlsmadrid.com';

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl(`${baseUrl}/escort/sharon.html`)).toBe(true);
    expect(adapter.isProfileUrl(`${baseUrl}/escorts-girl/`)).toBe(false);
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle(baseUrl)).toBe(true);
    expect(adapter.canHandle('https://www.google.com')).toBe(false);
  });

  it('should extract basic profile info', async () => {
    const html = `
      <html>
        <body>
          <div class="heading"><h1>Sharon</h1></div>
          <div class="folio-detail">
            <div class="widget">
              <h4>mi presentación</h4>
              <p>Descripción detallada de Sharon.</p>
            </div>
          </div>
          <div class="telefono">600 000 000</div>
          <ul class="meta-post">
            <li><label>Edad:</label> <span>25</span></li>
            <li><label>Nacionalidad:</label> <span>Española</span></li>
          </ul>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);
    const url = `${baseUrl}/escort/sharon.html`;

    const nickname = adapter['extractNickname']($, url);
    const phones = await adapter['extractPhones']($);
    const city = adapter['extractCity']($);
    const attributes = adapter['extractAttributes']($, url);

    expect(nickname).toBe('Sharon');
    expect(phones).toEqual(['600000000']);
    expect(city).toBe('Madrid');
    expect(attributes.age).toBe(25);
    expect(attributes.nationality).toBe('Española');
  });

  it('should extract phone from img alt if link missing', async () => {
    const html = `
      <html>
        <body>
          <div class="heading"><h1>Sharon</h1></div>
          <img src="banner.jpg" alt="Sharon 611222333">
        </body>
      </html>
    `;
    const $ = cheerio.load(html);
    const phones = await adapter['extractPhones']($);
    expect(phones).toEqual(['611222333']);
  });

  it('should extract attributes correctly', () => {
    const html = `
      <html>
        <body>
          <ul class="meta-post">
            <li><label>Estatura:</label> <span>170 cm</span></li>
            <li><label>Peso:</label> <span>55 kg</span></li>
            <li><label>Medidas:</label> <span>90-60-90</span></li>
            <li><label>Cabello:</label> <span>Rubio</span></li>
            <li><label>Ojos:</label> <span>Azules</span></li>
            <li><label>Horarios:</label> <span>24h</span></li>
          </ul>
          <div class="widget">
            <h4>tarifas</h4>
            <img src="/perfil-3.png">
          </div>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);
    const attributes = adapter['extractAttributes']($, `${baseUrl}/escort/sharon.html`);

    expect(attributes.heightCm).toBe(170);
    expect(attributes.weightKg).toBe(55);
    expect(attributes.measurements).toBe('90-60-90');
    expect(attributes.hairColor).toBe('Rubio');
    expect(attributes.eyeColor).toBe('Azules');
    expect(attributes.schedule).toBe('24h');
    expect(attributes.badges).toContain('range-3');
  });

  it('should handle missing elements gracefully', async () => {
    const $ = cheerio.load('<html><body></body></html>');
    const url = `${baseUrl}/escort/none.html`;

    expect(adapter['extractNickname']($, url)).toBe('');
    expect(await adapter['extractPhones']($)).toEqual([]);
    const attributes = adapter['extractAttributes']($, url);
    expect(attributes.age).toBeUndefined();
  });
});
