import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/domain';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name Milescorts
 * @domain milescorts.es
 * @technology Bootstrap 3 / PHP
 * @protection None
 * @ui_interactors Age gate, Cookies
 * @auth None
 * @url_listing /escorts-y-putas/{city-slug}/
 * @url_detail /escorts-y-putas/{city-slug}/{phone}-{slug}-{id}.htm
 * @extraction_method Playwright + Cheerio
 */
export class MilescortsAdapter extends DatingBaseAdapter {
  readonly identifier = 'milescorts';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: 'h1#anuncio-titular',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: 'section.datos-model p',
      expectedType: 'text',
      required: false,
    },
    gallery: {
      selector: '#fotos-anuncio img',
      expectedType: 'image-list',
      required: false,
    },
    phone: {
      selector: 'a[href^="tel:"]',
      expectedType: 'exists',
      required: false,
    },
    breadcrumb: {
      selector: 'ol.breadcrumb li',
      expectedType: 'exists',
      required: false,
    },
    nextPage: {
      selector: 'a[rel="next"], .pagination li.next a',
      expectedType: 'exists',
      required: false,
    },
    cookies: {
      selector: '#cn-accept-cookie, .cookie-notice-accept, #cookie-notice-accept',
      expectedType: 'exists',
      required: false,
    },
    ageGate: {
      selector: 'a.btn-success:contains("ENTRAR"), button:contains("ACEPTAR")',
      expectedType: 'exists',
      required: false,
    },
    verifiedBadge: {
      selector: 'a.btn-success[href*="fotos-reales"], .label-success:contains("Verificada")',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('milescorts.es');
  }

  isProfileUrl(url: string): boolean {
    return url.endsWith('.htm') && url.includes('/escorts-y-putas/');
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    const title = $(this.selectors.title.selector).text().trim();
    // Usually name is the first part before the rest of the title
    const firstWord = title.split(/[\s,]+/)[0];
    return firstWord || undefined;
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    // /escorts-y-putas/madrid-ciudad/631594827-escort-sexy-en-tu-zona-396681.htm
    const filename = new URL(url).pathname.split('/').pop() ?? '';
    return filename.match(/(\d+)\.htm$/)?.[1] ?? filename;
  }

  protected extractTitle($: CheerioAPI): string {
    return (
      $(this.selectors.title.selector).text().trim() ||
      $(DatingBaseAdapter.baseSelectors.h1Tag.selector).first().text().trim()
    );
  }

  protected extractDescription($: CheerioAPI): string {
    return $(this.selectors.description.selector).first().text().trim();
  }

  protected override async extractPhones($: CheerioAPI, url?: string): Promise<string[]> {
    // Phone is the first 9+ digit segment of the filename
    if (url) {
      const filename = new URL(url).pathname.split('/').pop() ?? '';
      const m = filename.match(/^(\d{9,})/);
      if (m) return [m[1]!];
    }
    const href = $(this.selectors.phone.selector).first().attr('href');
    if (href) return [href.replace('tel:', '').replace(/\D/g, '')];
    return [];
  }

  protected override extractCity($: CheerioAPI, url?: string): string | undefined {
    if (url) {
      // /escorts-y-putas/{city-slug}/{phone}...htm
      const parts = new URL(url).pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return parts[parts.length - 2]!.replace(/-/g, ' ');
      }
    }
    return $(this.selectors.breadcrumb.selector).last().text().trim() || undefined;
  }

  protected extractRates(_$: CheerioAPI): EscortRate[] {
    return [];
  }

  protected extractServices(_$: CheerioAPI): EscortService[] {
    return [];
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);
    const verified = $(this.selectors.verifiedBadge.selector).length > 0;

    return {
      ...base,
      verified,
      independent: true,
      badges: verified ? ['verified'] : base.badges,
    };
  }

  extractNextPageUrl(html: string, _baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    return $(this.selectors.nextPage.selector).attr('href') ?? undefined;
  }
}
