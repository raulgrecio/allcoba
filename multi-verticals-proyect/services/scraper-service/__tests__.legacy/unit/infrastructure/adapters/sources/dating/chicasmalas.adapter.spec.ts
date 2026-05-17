import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { ChicasmalasAdapter } from '#infrastructure/adapters/sources/dating/chicasmalas.adapter.js';

describe('ChicasmalasAdapter', () => {
  const adapter = new ChicasmalasAdapter({} as CrawlerPort);

  const html = `
    <html>
      <body>
        <div id="cmFichaV9">
          <h2>Valentina</h2>
          <div class="cm-v9-desc">Una experiencia única en Madrid.</div>
          <div class="cm-v9-row"><span>Edad</span><span>22</span></div>
          <div class="cm-v9-row"><span>Altura</span><span>170 cm</span></div>
          <div class="cm-v9-row"><span>Peso</span><span>55 kg</span></div>
          <div class="cm-v9-row"><span>Nacionalidad</span><span>Brasileña</span></div>
          <div class="cm-v9-row"><span>Zona</span><span>Pozuelo</span></div>
          <div class="cm-v9-row"><span>Empty</span><span></span></div>
          <div class="cm-v9-badge gold">Verificada</div>
          <div class="cm-v9-thumbs">
            <div class="cm-v9-thumb"><img src="img1.jpg"></div>
            <div class="cm-v9-thumb"><img src="img2.jpg"></div>
          </div>
          <a href="tel:600111222">Llamar</a>
          <div class="cm-v9-cta">
            <a class="cm-v9-btn-wa" href="https://wa.me/34600111222">WhatsApp</a>
            <a class="cm-v9-btn-tg" href="https://t.me/valentinatg">Telegram</a>
          </div>
          <div class="cm-v9-chip">Besos</div>
          <div class="cm-v9-chip">69</div>
          <div class="cm-v9-chip">Incall</div>
        </div>
        <a rel="next" href="https://chicasmalas.es/escorts/madrid/page/2/">Next</a>
      </body>
    </html>
  `;

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl('https://chicasmalas.es/escorts/madrid/valentina/')).toBe(true);
    expect(adapter.isProfileUrl('https://chicasmalas.es/escorts/madrid/')).toBe(false);
    expect(adapter.isProfileUrl('https://chicasmalas.es/escorts/madrid/valentina/?param=1')).toBe(
      false,
    );
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle('https://chicasmalas.es/any')).toBe(true);
  });

  it('should extract basic profile info', async () => {
    const $ = cheerio.load(html);
    const url = 'https://chicasmalas.es/escorts/madrid/valentina/';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const nickname = adapter['extractNickname']($, url);
    const description = adapter['extractDescription']($);
    const phones = await adapter['extractPhones']($);

    expect(id).toBe('valentina');
    expect(title).toBe('Valentina');
    expect(nickname).toBe('Valentina');
    expect(description).toContain('experiencia única');
    expect(phones).toContain('600111222');
  });

  it('should extract social handles correctly', () => {
    const $ = cheerio.load(html);
    const whatsapp = adapter['extractWhatsapp']($);
    const telegram = adapter['extractTelegram']($);

    expect(whatsapp).toBe('+34600111222');
    expect(telegram).toBe('@valentinatg');
  });

  it('should handle disabled social buttons', () => {
    const disabledHtml = `
      <div id="cmFichaV9">
        <div class="cm-v9-cta">
          <a class="cm-v9-btn-wa" style="pointer-events:none" href="https://wa.me/34600111222">WhatsApp</a>
          <a class="cm-v9-btn-tg" style="pointer-events:none" href="https://t.me/valentinatg">Telegram</a>
        </div>
      </div>
    `;
    const $ = cheerio.load(disabledHtml);
    expect(adapter['extractWhatsapp']($)).toBeUndefined();
    expect(adapter['extractTelegram']($)).toBeUndefined();
  });

  it('should skip site-level Telegram', () => {
    const siteTgHtml = `
      <div id="cmFichaV9">
        <div class="cm-v9-cta">
          <a class="cm-v9-btn-tg" href="https://t.me/CHICASMALASES">Telegram</a>
        </div>
      </div>
    `;
    const $ = cheerio.load(siteTgHtml);
    expect(adapter['extractTelegram']($)).toBeUndefined();
  });

  it('should extract attributes and services correctly', () => {
    const $ = cheerio.load(html);
    const url = 'https://chicasmalas.es/escorts/madrid/valentina/';
    const attributes = adapter['extractAttributes']($, url);
    const city = adapter['extractCity']($, url);

    expect(attributes.age).toBe(22);
    expect(attributes.verified).toBe(true);
    expect(city).toBe('Pozuelo');
    expect(attributes.services).toHaveLength(2);
    expect(attributes.serviceLocations).toContain('Incall');
  });

  it('should handle missing row fields', () => {
    const $ = cheerio.load(html);
    expect(adapter['extractCmRow']($, 'Empty')).toBeUndefined();
    expect(adapter['extractCmRow']($, 'NonExistent')).toBeUndefined();
  });

  it('should extract city from URL if not in rows', () => {
    const noCityHtml = '<div id="cmFichaV9"></div>';
    const $ = cheerio.load(noCityHtml);
    const url = 'https://chicasmalas.es/escorts/barcelona-ciudad/maria/';
    expect(adapter['extractCity']($, url)).toBe('barcelona ciudad');
  });

  it('should extract next page URL', () => {
    const nextUrl = adapter.extractNextPageUrl(html, 'url');
    expect(nextUrl).toBe('https://chicasmalas.es/escorts/madrid/page/2/');
  });
});
