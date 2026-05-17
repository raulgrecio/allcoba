import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { EuroGirlsEscortAdapter } from '#infrastructure/adapters/sources/dating/eurogirlsescort.adapter.js';

describe('EuroGirlsEscortAdapter', () => {
  const adapter = new EuroGirlsEscortAdapter({} as CrawlerPort);

  const html = `
    <html>
      <body>
        <div class="description">
          <h1>Valentina - Escort en Barcelona</h1>
          <p class="js-more">Una escort muy elegante.</p>
        </div>
        <div class="params">
          <div><span>Edad:</span> <strong>24</strong></div>
          <div><span>Altura:</span> <strong>170</strong></div>
          <div><span>Peso:</span> <strong>55</strong></div>
          <div><span>Nacionalidad:</span> <strong>Ucraniana</strong></div>
          <div>City part: <strong>Eixample</strong></div>
          <div>Location: <strong><strong><a>Barcelona City</a></strong></strong></div>
        </div>
        <div class="contacts">
          <div class="row"><span>Ciudad:</span> <strong>Barcelona</strong></div>
          <div class="row"><span>País:</span> <strong>España</strong></div>
        </div>
        <div class="services">
          <table>
            <tbody>
              <tr><th>Masaje</th><td><i class="icon-check"></i></td><td><i class="icon-close"></i></td></tr>
            </tbody>
          </table>
        </div>
        <div class="rates">
          <table>
            <tbody>
              <tr><th>1h</th><td>100 €</td><td>150 €</td></tr>
            </tbody>
          </table>
        </div>
        <div class="reviews">
          <div id="reviews-content">
            <div class="item">
              <h3><strong>John Doe</strong> <span>2023-01-01</span> <div class="stars"><i class="full"></i></div></h3>
              <div class="more-text">Great experience!</div>
              <div class="nowrap">Ciudad / País: Barcelona</div>
              <div class="nowrap">Fecha de la cita Enero 2023</div>
            </div>
          </div>
        </div>
        <a class="js-phone" href="tel:600999000">600 999 000</a>
        <a href="https://wa.me/34666777888"><i class="icon-whatsapp"></i></a>
        <div id="js-gallery">
          <a href="/img1.jpg"></a>
        </div>
      </body>
    </html>
  `;

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl('https://eurogirlsescort.com/escort/spain/madrid/sofia/123/')).toBe(
      true,
    );
    expect(adapter.isProfileUrl('https://eurogirlsescort.com/any?list=1')).toBe(false);
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle('https://eurogirlsescort.com/any')).toBe(true);
  });

  it('should extract basic profile info', async () => {
    const $ = cheerio.load(html);
    const url = 'https://www.eurogirlsescort.com/escort/spain/barcelona/valentina/430899/';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const nickname = adapter['extractNickname']($, url);
    const city = adapter['extractCity']($);
    const phones = await adapter['extractPhones']($);

    expect(id).toBe('430899');
    expect(title).toContain('Valentina');
    expect(nickname).toBe('valentina');
    expect(city).toBe('Barcelona');
    expect(phones).toContain('600 999 000');
  });

  it('should handle ID with query params', () => {
    expect(
      adapter['extractId']('https://eurogirlsescort.com/escort/name/123/?list=1', cheerio.load('')),
    ).toBe('123');
  });

  it('should fallback for city and extract zone', () => {
    const $ = cheerio.load(
      '<html><body><div class="params"><div>Location: <strong><strong><a>Fallback City</a></strong></strong></div><div>City part: <strong>Chamartin</strong></div></div></body></html>',
    );
    expect(adapter['extractCity']($)).toBe('Fallback City');
    expect(adapter['extractZone']($)).toBe('Chamartin');
  });

  it('should extract attributes correctly', () => {
    const $ = cheerio.load(html);
    const url = 'https://www.eurogirlsescort.com/escort/spain/barcelona/valentina/430899/';
    const attributes = adapter['extractAttributes']($, url);

    expect(attributes.age).toBe(24);
    expect(attributes.services).toHaveLength(1);
    expect(attributes.rates).toHaveLength(1);
    expect(attributes.rates?.[0]?.incall).toBe(100);
    expect(attributes.reviews).toHaveLength(1);
    expect(attributes.reviews?.[0]?.author).toBe('John Doe');
  });

  it('should extract next page URL', () => {
    const nextUrl = adapter.extractNextPageUrl(
      '',
      'https://eurogirlsescort.com/escorts/spain/madrid/',
    );
    expect(nextUrl).toContain('profile-paginator-page=2');
  });

  it('should extract WhatsApp separately', () => {
    const $ = cheerio.load(html);
    expect(adapter['extractWhatsapp']($)).toBe('+34666777888');
  });
});
