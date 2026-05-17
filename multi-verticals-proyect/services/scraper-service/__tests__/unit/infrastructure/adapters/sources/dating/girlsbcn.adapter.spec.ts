import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { GirlsBCNAdapter } from '#infrastructure/adapters/sources/dating/girlsbcn.adapter.js';

describe('GirlsBCNAdapter', () => {
  const adapter = new GirlsBCNAdapter({} as CrawlerPort);

  const html = `
    <html>
      <body>
        <h1 class="css_escort">MARIA</h1>
        <p class="texto css_escort">Una chica muy simpática disponible en: Barcelona.</p>
        <dl class="dl-horizontal">
          <dt>Edad:</dt><dd>24</dd>
          <dt>Nacionalidad:</dt><dd>Brasil</dd>
          <dt>Estatura:</dt><dd>170 cm</dd>
          <dt>Peso:</dt><dd>55 kg</dd>
          <dt>Cabello:</dt><dd>Moreno</dd>
          <dt>Ojos:</dt><dd>Marrones</dd>
        </dl>
        <a href="tel:600111222">Llamar</a>
        <p class="rango css_escort"><img src="/perfil-4.png"></p>
        <video class="css_escort">
          <source src="video.mp4">
        </video>
        <a rel="next" href="https://girlsbcn.net/escorts-girl/page/2/">Siguiente</a>
      </body>
    </html>
  `;

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl('https://girlsbcn.net/escort/maria.html')).toBe(true);
    expect(adapter.isProfileUrl('https://girlsbcn.net/escorts-girl/')).toBe(false);
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle('https://girlsbcn.net/any')).toBe(true);
    expect(adapter.canHandle('https://girlsbcn.com/any')).toBe(true);
  });

  it('should extract basic profile info', async () => {
    const $ = cheerio.load(html);
    const url = 'https://girlsbcn.net/escort/maria.html';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const nickname = adapter['extractNickname']($, url);
    const description = adapter['extractDescription']($);
    const phones = await adapter['extractPhones']($);
    const city = adapter['extractCity']($);

    expect(id).toBe('maria');
    expect(title).toBe('MARIA');
    expect(nickname).toBe('MARIA');
    expect(description).toContain('simpática');
    expect(phones).toContain('600111222');
    expect(city).toBe('Barcelona');
  });

  it('should extract phone from img alt if link missing', async () => {
    const htmlWithAlt = `
      <html>
        <body>
          <img class="foto css_escort" src="img.jpg" alt="600222333">
        </body>
      </html>
    `;
    const $ = cheerio.load(htmlWithAlt);
    const phones = await adapter['extractPhones']($);
    expect(phones).toContain('600222333');
  });

  it('should extract attributes correctly', () => {
    const $ = cheerio.load(html);
    const url = 'https://girlsbcn.net/escort/maria.html';
    const attributes = adapter['extractAttributes']($, url);

    expect(attributes.age).toBe(24);
    expect(attributes.nationality).toBe('Brasil');
    expect(attributes.heightCm).toBe(170);
    expect(attributes.weightKg).toBe(55);
    expect(attributes.hairColor).toBe('Moreno');
    expect(attributes.eyeColor).toBe('Marrones');
    expect(attributes.videoAvailable).toBe(true);
    expect(attributes.badges).toContain('range-4');
    expect(attributes.badges).toContain('video');
  });

  it('should handle missing elements gracefully', () => {
    const $ = cheerio.load('<html><body></body></html>');
    expect(adapter['extractCity']($)).toBeUndefined();
    expect(adapter['extractDlField']($, 'NonExistent')).toBeUndefined();
  });
});
