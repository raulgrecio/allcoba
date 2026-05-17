import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/domain';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name Milpasiones
 * @domain milpasiones.com
 * @technology PHP Custom
 * @protection None
 * @ui_interactors Cookies // PENDIENTE: Añadir verificación de edad
 * @auth None
 * @url_listing /escorts/{city}/
 * @url_detail /anuncio/{phone}-{slug}_{id}/
 * @extraction_method Playwright + Cheerio (body renderizado por JS, head SSR)
 */
export class MilpasionesAdapter extends DatingBaseAdapter {
  readonly identifier = 'milpasiones';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: '.main_article h1, h1',
      expectedType: 'text',
      required: true,
    },
    metaTitle: {
      selector: 'meta[property="og:title"]',
      expectedType: 'text',
      required: false,
    },
    metaDescription: {
      selector: 'meta[property="og:description"]',
      expectedType: 'text',
      required: false,
    },
    gallery: {
      selector: 'meta[property="og:image"], [class*="splide"] img, .gallery img',
      expectedType: 'image-list',
      required: false,
    },
    geoPlace: {
      selector: 'meta[name="geo.placename"]',
      expectedType: 'text',
      required: false,
    },
    nextPage: {
      selector: 'link[rel="next"], a[rel="next"]',
      expectedType: 'exists',
      required: false,
    },
    cookies: {
      selector: '.cookie_advice button, button[class*="accept"], #accept-cookies',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('milpasiones.com');
  }

  isProfileUrl(url: string): boolean {
    return url.includes('/anuncio/');
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    const title = this.extractTitle($);
    // Usually "668595913 ELENA LA MÁS CACHONDA" -> "ELENA"
    const match = title.match(/^(?:\d+\s+)?([^\s,]+)/);
    return match ? match[1] : undefined;
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    // /anuncio/668595913-elena-..._231561/
    const m = new URL(url).pathname.match(/_(\d+)\/?$/);
    return m ? m[1]! : (new URL(url).pathname.split('/').filter(Boolean).pop() ?? url);
  }

  protected extractTitle($: CheerioAPI): string {
    // Title tag: "668595913 ELENA LA MÁS CACHONDA..."
    const metaTitle = $(this.selectors.metaTitle.selector).attr('content') ?? '';
    if (metaTitle) return metaTitle;
    return (
      $(DatingBaseAdapter.baseSelectors.titleTag.selector).text().split(' - ')[0]?.trim() ?? ''
    );
  }

  protected extractDescription($: CheerioAPI): string {
    return $(this.selectors.metaDescription.selector).attr('content') ?? '';
  }

  protected override async extractPhones(_$: CheerioAPI, url?: string): Promise<string[]> {
    // Phone is the first segment of the filename before the first "-"
    if (url) {
      const filename = new URL(url).pathname.replace(/\/anuncio\//, '').split('/')[0] ?? '';
      const m = filename.match(/^(\d{9,})/);
      if (m) return [m[1]!];
    }
    return [];
  }

  protected override extractCity($: CheerioAPI): string | undefined {
    // Geo meta: <meta name="geo.placename" content="Collado Villalba">
    return $(this.selectors.geoPlace.selector).attr('content') || undefined;
  }

  protected extractRates(_$: CheerioAPI): EscortRate[] {
    return [];
  }

  protected extractServices(_$: CheerioAPI): EscortService[] {
    return [];
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);
    return {
      ...base,
      independent: true,
      verified: base.verified,
      badges: base.badges ?? [],
      rates: [],
      services: [],
      reviews: [],
    };
  }

  extractNextPageUrl(html: string, baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    const next = $(this.selectors.nextPage.selector).attr('href');
    if (next) {
      try {
        return new URL(next, baseUrl).toString();
      } catch {
        /* ignore */
      }
    }
    const pageMatch = baseUrl.match(/[?&]pag=(\d+)/);
    const page = pageMatch ? parseInt(pageMatch[1]!, 10) + 1 : 2;
    try {
      const urlObj = new URL(baseUrl);
      urlObj.searchParams.set('pag', page.toString());
      return urlObj.toString();
    } catch {
      const sep = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${sep}pag=${page}`;
    }
  }
}
