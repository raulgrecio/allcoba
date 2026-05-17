import { describe, expect, it } from 'vitest';
import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/legacy-domain';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import type {
  EscortRate,
  EscortService,
} from '#infrastructure/adapters/sources/dating/dating-attributes.js';
import { DatingBaseAdapter } from '#infrastructure/adapters/sources/dating/dating.base.js';

class TestDatingAdapter extends DatingBaseAdapter {
  readonly identifier = 'test-dating';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';
  canHandle(_url: string): boolean {
    return true;
  }
  protected extractId(_url: string): string {
    return 'id';
  }
  protected extractTitle(_$: CheerioAPI): string {
    return 'title';
  }
  protected extractDescription(_$: CheerioAPI): string {
    return '';
  }
  protected extractRates(_$: CheerioAPI): EscortRate[] {
    return [];
  }
  protected extractServices(_$: CheerioAPI): EscortService[] {
    return [];
  }
}

describe('Unit: DatingBaseAdapter', () => {
  const adapter = new TestDatingAdapter({} as CrawlerPort);

  describe('extractParam', () => {
    it('returns value from .params span label', () => {
      const $ = cheerio.load('<div class="params"><span>Edad:</span><strong>25</strong></div>');
      expect(adapter['extractParam']($, 'Edad')).toBe('25');
    });

    it('returns undefined when label absent', () => {
      const $ = cheerio.load('<div class="params"></div>');
      expect(adapter['extractParam']($, 'Edad')).toBeUndefined();
    });
  });

  describe('extractParamInt', () => {
    it('parses integer from param', () => {
      const $ = cheerio.load('<div class="params"><span>Edad:</span><strong>28</strong></div>');
      expect(adapter['extractParamInt']($, 'Edad')).toBe(28);
    });
  });

  describe('extractParamBool', () => {
    it('returns true for "Sí"', () => {
      const $ = cheerio.load('<div class="params"><span>Tatuaje:</span><strong>Sí</strong></div>');
      expect(adapter['extractParamBool']($, 'Tatuaje')).toBe(true);
    });

    it('returns false for "No"', () => {
      const $ = cheerio.load('<div class="params"><span>Tatuaje:</span><strong>No</strong></div>');
      expect(adapter['extractParamBool']($, 'Tatuaje')).toBe(false);
    });

    it('returns undefined when absent', () => {
      const $ = cheerio.load('<div></div>');
      expect(adapter['extractParamBool']($, 'Tatuaje')).toBeUndefined();
    });
  });

  describe('parseFirstInt', () => {
    it('extracts first integer from string', () => {
      expect(adapter['parseFirstInt']("155 cm / 5'1''")).toBe(155);
    });

    it('returns undefined for undefined input', () => {
      expect(adapter['parseFirstInt'](undefined)).toBeUndefined();
    });

    it('returns undefined when no digits', () => {
      expect(adapter['parseFirstInt']('sin datos')).toBeUndefined();
    });
  });

  describe('extractCity / extractZone (span-based)', () => {
    it('returns Lugar param as city', () => {
      const $ = cheerio.load(
        '<div class="params"><span>Lugar:</span><strong>Madrid</strong></div>',
      );
      expect(adapter['extractCity']($)).toBe('Madrid');
    });

    it('returns Ciudad param as zone', () => {
      const $ = cheerio.load(
        '<div class="params"><span>Ciudad:</span><strong>Vallecas</strong></div>',
      );
      expect(adapter['extractZone']($)).toBe('Vallecas');
    });
  });

  describe('extractWhatsapp', () => {
    it('extracts number from wa.me href', () => {
      const $ = cheerio.load(
        '<a href="https://wa.me/34612345678"><i class="icon-whatsapp"></i></a>',
      );
      expect(adapter['extractWhatsapp']($)).toBe('+34612345678');
    });

    it('returns undefined when no whatsapp link', () => {
      const $ = cheerio.load('<div></div>');
      expect(adapter['extractWhatsapp']($)).toBeUndefined();
    });

    it('returns undefined when href has no wa.me pattern', () => {
      const $ = cheerio.load('<a href="/contacto"><i class="icon-whatsapp"></i></a>');
      expect(adapter['extractWhatsapp']($)).toBeUndefined();
    });
  });

  describe('extractMapCoordinates (via extractCoordinates)', () => {
    it('returns coordinates from valid incall-map data-data', () => {
      const geoJson = JSON.stringify({
        features: [{ geometry: { coordinates: [-3.7, 40.4] } }],
      });
      const $ = cheerio.load(`<div id="incall-map" data-data='${geoJson}'></div>`);
      expect(adapter['extractCoordinates']($)).toEqual({ lat: 40.4, lng: -3.7 });
    });

    it('returns undefined when incall-map absent', () => {
      const $ = cheerio.load('<div></div>');
      expect(adapter['extractCoordinates']($)).toBeUndefined();
    });

    it('returns undefined when data-data is invalid JSON', () => {
      const $ = cheerio.load('<div id="incall-map" data-data="not-json"></div>');
      expect(adapter['extractCoordinates']($)).toBeUndefined();
    });

    it('returns undefined when features array is empty', () => {
      const $ = cheerio.load(`<div id="incall-map" data-data='{"features":[]}'></div>`);
      expect(adapter['extractCoordinates']($)).toBeUndefined();
    });

    it('returns undefined when coordinates array has fewer than 2 elements', () => {
      const geoJson = JSON.stringify({ features: [{ geometry: { coordinates: [-3.7] } }] });
      const $ = cheerio.load(`<div id="incall-map" data-data='${geoJson}'></div>`);
      expect(adapter['extractCoordinates']($)).toBeUndefined();
    });
  });

  describe('extractReviews (default)', () => {
    it('returns empty array by default', () => {
      const $ = cheerio.load('<div></div>');
      expect(adapter['extractReviews']($)).toEqual([]);
    });
  });

  describe('extractAttributes', () => {
    it('extracts badges', () => {
      const $ = cheerio.load('<span class="badge-video"></span><span class="badge-new"></span>');
      const attrs = adapter['extractAttributes']($, 'https://example.com');
      expect(attrs.badges).toContain('video');
      expect(attrs.badges).toContain('new');
    });

    it('extracts independent flag from badge class', () => {
      const $ = cheerio.load('<span class="badge-independent"></span>');
      const attrs = adapter['extractAttributes']($, 'https://example.com');
      expect(attrs.independent).toBe(true);
    });

    it('extracts telegram handle via telegramLink fallback', () => {
      const $ = cheerio.load('<body><a href="https://t.me/myuser">tg</a></body>');
      expect(adapter['extractTelegram']($)).toBe('@myuser');
    });

    it('returns undefined for telegram when no link or icon', () => {
      const $ = cheerio.load('<body></body>');
      expect(adapter['extractTelegram']($)).toBeUndefined();
    });

    it('returns undefined for price by default', () => {
      const $ = cheerio.load('<body></body>');
      expect(adapter['extractPrice']($)).toBeUndefined();
    });
  });

  describe('extractAttributes', () => {
    it('extracts website via extractWebsite', () => {
      const $ = cheerio.load(
        '<body><i class="icon-www"></i><a href="https://mysite.com">web</a></body>',
      );
      expect(adapter['extractWebsite']($)).toBe('https://mysite.com');
    });

    it('returns undefined for website when link missing', () => {
      const $ = cheerio.load('<body><i class="icon-www"></i></body>');
      expect(adapter['extractWebsite']($)).toBeUndefined();
    });

    it('extracts instagram via extractInstagram', () => {
      const $ = cheerio.load(
        '<body><a href="https://instagram.com/user"><i class="icon-instagram"></i></a></body>',
      );
      expect(adapter['extractInstagram']($)).toBe('@user');
    });

    it('extracts tiktok via extractTiktok', () => {
      const $ = cheerio.load(
        '<body><a href="https://tiktok.com/@user"><i class="icon-tiktok"></i></a></body>',
      );
      expect(adapter['extractTiktok']($)).toBe('@user');
    });

    it('extracts twitter via extractTwitter', () => {
      const $ = cheerio.load(
        '<body><a href="https://twitter.com/user"><i class="icon-twitter"></i></a></body>',
      );
      expect(adapter['extractTwitter']($)).toBe('@user');
    });

    it('extracts onlyfans via extractOnlyfans', () => {
      const $ = cheerio.load(
        '<a href="https://onlyfans.com/user"><i class="icon-onlyfans"></i></a>',
      );
      expect(adapter['extractOnlyfans']($)).toBe('user');
    });

    it('extracts fansly via extractFansly', () => {
      const $ = cheerio.load('<a href="https://fansly.com/user"><i class="icon-fansly"></i></a>');
      expect(adapter['extractFansly']($)).toBe('user');
    });

    it('extracts all social handles via extractContacts', () => {
      const html = `
        <body>
          <a href="https://wa.me/34612345678">wa</a>
          <i class="icon-telegram" data-telegram="@tg"></i>
          <a href="https://instagram.com/ig">ig</a>
          <a href="https://tiktok.com/@tk">tk</a>
          <a href="https://twitter.com/tw">tw</a>
          <a href="https://onlyfans.com/of">of</a>
          <a href="https://fansly.com/fs">fs</a>
          <i class="icon-www"></i><a href="https://site.com">web</a>
        </body>
      `;
      const $ = cheerio.load(html);
      const contacts = adapter['extractContacts']($, {});
      const platforms = contacts.map((c) => c.platform);
      expect(platforms).toContain('WHATSAPP');
      expect(platforms).toContain('TELEGRAM');
      expect(platforms).toContain('INSTAGRAM');
      expect(platforms).toContain('TIKTOK');
      expect(platforms).toContain('TWITTER');
      expect(platforms).toContain('ONLYFANS');
      expect(platforms).toContain('FANSLY');
      expect(platforms).toContain('WEBSITE');
    });

    it('extracts languages split by comma', () => {
      const $ = cheerio.load(
        '<div class="params"><span>Idiomas:</span><strong>español, inglés</strong></div>',
      );
      const attrs = adapter['extractAttributes']($, 'https://example.com');
      expect(attrs.languages).toEqual(['español', 'inglés']);
    });
  });
});
