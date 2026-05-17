import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { ArdientePlacer } from '#infrastructure/adapters/sources/dating/ardienteplacer.adapter.js';

describe('Unit: ArdientePlacerAdapter', () => {
  const adapter = new ArdientePlacer({} as CrawlerPort);

  const html = `
    <html>
      <body>
        <h3 id="info">Elena la más bella</h3>
        <div style="word-break: break-word">
          <div class="toplistingblock">Should be removed</div>
          Hola soy Elena...
        </div>
        <div class="widget clearfix">
          <ul class="listawidget">
            <li>Elena</li>
            <li>24 años</li>
            <li>Madrid, Madrid</li>
          </ul>
        </div>
        <ul class="entry-meta">
          <li>100 €/hora</li>
          <li>45 años</li>
          <img src="/images/flags/es.png" alt="De España">
        </ul>
        <h5 class="titulo">Servicios</h5>
        <ul class="list-unstyled">
          <li>Masaje</li>
          <li>Besos</li>
        </ul>
        <div class="modal1">
          <div class="tel"><b>600 777 888</b></div>
          <a href="https://wa.me/34600777888">WA</a>
        </div>
        <div class="postcatblock">Mujeres en Barcelona (Barcelona)</div>
        <a rel="next" href="https://ardienteplacer.com/escorts/chicas/page/2/">Next</a>
      </body>
    </html>
  `;

  it('should identify profile URLs correctly', () => {
    expect(
      adapter.isProfileUrl('https://ardienteplacer.com/escort/chica/madrid/666777888/123'),
    ).toBe(true);
    expect(adapter.isProfileUrl('https://ardienteplacer.com/escorts/chicas')).toBe(false);
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle('https://ardienteplacer.com/any')).toBe(true);
  });

  it('should extract basic info from DOM', async () => {
    const $ = cheerio.load(html);
    const url = 'https://ardienteplacer.com/escort/chica/madrid/600777888/123';

    const id = adapter['extractId'](url);
    const title = adapter['extractTitle']($);
    const nickname = adapter['extractNickname']($, url);
    const description = adapter['extractDescription']($);
    const phones = await adapter['extractPhones']($, url);
    const city = adapter['extractCity']($, url);

    expect(id).toBe('123');
    expect(title).toBe('Elena la más bella');
    expect(nickname).toBe('Elena');
    expect(description).toBe('Hola soy Elena...');
    expect(phones).toContain('600777888');
    expect(city).toBe('Madrid');
  });

  it('should fallback for title and city', () => {
    const $ = cheerio.load(
      '<html><body><h1>Sofia - Madrid</h1><div class="postcatblock">Mujeres en Valencia</div></body></html>',
    );
    expect(adapter['extractTitle']($)).toBe('Sofia');
    expect(
      adapter['extractCity']($, 'https://ardienteplacer.com/escort/chica/sevilla/666777888/123'),
    ).toBe('Valencia');
    expect(
      adapter['extractCity'](
        cheerio.load(''),
        'https://ardienteplacer.com/escort/chica/malaga/666777888/123',
      ),
    ).toBe('malaga');
  });

  it('should extract attributes correctly', () => {
    const $ = cheerio.load(html);
    const url = 'https://ardienteplacer.com/escort/chica/madrid/600777888/123';
    const attributes = adapter['extractAttributes']($, url);

    expect(attributes.age).toBe(24); // From widget first
    expect(attributes.nationality).toBe('España');
    expect(attributes.rates).toHaveLength(1);
    expect(attributes.rates[0]?.incall).toBe(100);
    expect(attributes.services).toHaveLength(2);
  });

  it('should handle images and transformations', () => {
    expect(adapter['transformImageUrl']('img-m.jpg')).toBe('');
    expect(adapter['transformImageUrl']('img.jpg')).toBe('img.jpg');
  });

  it('should extract next page URL', () => {
    const nextUrl = adapter.extractNextPageUrl(html, 'https://ardienteplacer.com/escorts/chicas/');
    expect(nextUrl).toBe('https://ardienteplacer.com/escorts/chicas/page/2/');

    const nextUrl2 = adapter.extractNextPageUrl(
      '<html><body></body></html>',
      'https://ardienteplacer.com/escorts/chicas/',
    );
    expect(nextUrl2).toBe('https://ardienteplacer.com/escorts/chicas/?pagina=2');
  });

  it('should extract WhatsApp separately', () => {
    const $ = cheerio.load(html);
    expect(adapter['extractWhatsapp']($)).toBe('+34600777888');
  });
});
