import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { EscortAdvisorAdapter } from '#infrastructure/adapters/sources/dating/escort-advisor.adapter.js';

describe('EscortAdvisorAdapter', () => {
  const adapter = new EscortAdvisorAdapter({} as CrawlerPort);

  const html = `
    <html>
      <body>
        <div class="username"><h2>Camila</h2></div>
        <div class="data-container">
          <div class="content">Una escort de lujo.</div>
        </div>
        <div id="gallery-modal" data-escort_id="998877"></div>
        <div class="personal-info">
          <ul class="info-list">
            <li>Edad: 30</li>
            <li>Altura: 175 cm</li>
            <li>Peso: 65 kg</li>
            <li>Nacionalidad: Italiana</li>
          </ul>
        </div>
        <div class="preferences">
          <ul class="info-list">
            <li>Besos</li>
            <li>69</li>
          </ul>
        </div>
        <div class="rate-table">
          <table class="rate">
            <tr><td>1 hora</td><td>150 €</td></tr>
            <tr><td>2 horas</td><td>250 €</td></tr>
          </table>
        </div>
        <a href="tel:600777888">Llamar</a>
        <div class="verified-badge"></div>
        <div class="breadcrumb">
          <a>Home</a>
          <a>Spain</a>
          <a>Madrid</a>
        </div>
      </body>
    </html>
  `;

  it('should extract basic profile info', async () => {
    const $ = cheerio.load(html);
    const url = 'https://escort-advisor.xxx/escorts/spain/madrid/camila/998877';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const city = adapter['extractCity']($);
    const phones = await adapter['extractPhones']($);

    expect(id).toBe('998877');
    expect(title).toBe('Camila');
    expect(city).toBe('Madrid');
    expect(phones).toContain('600777888');
  });

  it('should extract attributes correctly', () => {
    const $ = cheerio.load(html);
    const url = 'https://escort-advisor.xxx/escorts/spain/madrid/camila/998877';
    const attributes = adapter['extractAttributes']($, url);

    expect(attributes.nickname).toBe('Camila');
    expect(attributes.age).toBe(30);
    expect(attributes.heightCm).toBe(175);
    expect(attributes.nationality).toBe('Italiana');
    expect(attributes.verified).toBe(true);
    expect(attributes.rates).toHaveLength(2);
    expect(attributes.rates[0]?.incall).toBe(150);
  });
});
