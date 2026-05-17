import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/domain';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name GirlsMadrid
 * @domain girlsmadrid.com
 * @technology PHP SSR (estructura HTML idéntica a GirlsBCN)
 * @protection None
 * @ui_interactors Age gate, Cookies // TODO: Revisar si son necesarios. yo no lo he visto
 * @auth None
 * @url_listing /escorts-girl/
 * @url_detail /escort/{slug}.html
 * @extraction_method Playwright + Cheerio
 */
export class GirlsMadridAdapter extends DatingBaseAdapter {
  readonly identifier = 'girlsmadrid';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: '.heading h1',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: '.folio-detail .widget p',
      expectedType: 'text',
      required: false,
    },
    descriptionWidget: {
      selector: '.folio-detail .widget h4:contains("mi presentación")',
      expectedType: 'exists',
      required: false,
    },
    gallery: {
      selector: '[data-thumbnail], .media-box-image img, .banner',
      expectedType: 'image-list',
      required: false,
    },
    phone: {
      selector: '.telefono',
      expectedType: 'text',
      required: false,
    },
    metaItems: {
      selector: '.meta-post li',
      expectedType: 'exists',
      required: false,
    },
    dlItems: {
      selector: 'dl.dl-horizontal dt',
      expectedType: 'exists',
      required: false,
    },
    priceRangeWidget: {
      selector: '.widget h4:contains("tarifas")',
      expectedType: 'exists',
      required: false,
    },
    nextPage: {
      selector: 'a[rel="next"], .pagination a.next',
      expectedType: 'exists',
      required: false,
    },
    ageGate: {
      selector: '#modal-aviso button, a:contains("ENTRAR"), button:contains("Aceptar")',
      expectedType: 'exists',
      required: false,
    },
    cookies: {
      selector:
        '#onetrust-accept-btn-handler, button[class*="accept"], .cc-accept, #cn-accept-cookie, .cookie-notice-accept, #cookie-notice-accept',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('girlsmadrid.com');
  }

  isProfileUrl(url: string): boolean {
    return /\/escort\/[^/]+\.html/.test(url);
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    return $(this.selectors.title.selector).first().text().trim();
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    return new URL(url).pathname.split('/').filter(Boolean).pop() ?? url;
  }

  protected extractTitle($: CheerioAPI): string {
    return $(this.selectors.title.selector).first().text().trim();
  }

  protected extractDescription($: CheerioAPI): string {
    return $(this.selectors.descriptionWidget.selector).next('p').text().trim();
  }

  private extractMetaField($: CheerioAPI, label: string): string | undefined {
    const items = $(this.selectors.metaItems.selector);
    for (let i = 0; i < items.length; i++) {
      if (items.eq(i).find('label').text().trim().toLowerCase().includes(label.toLowerCase())) {
        return items.eq(i).find('span').text().trim() || undefined;
      }
    }
    return undefined;
  }

  private extractDlField($: CheerioAPI, label: string): string | undefined {
    const dts = $(this.selectors.dlItems.selector);
    for (let i = 0; i < dts.length; i++) {
      if (dts.eq(i).text().trim().replace(/:$/, '') === label) {
        return dts.eq(i).next('dd').text().trim() || undefined;
      }
    }
    return undefined;
  }

  protected override async extractPhones($: CheerioAPI): Promise<string[]> {
    const phone = $(this.selectors.phone.selector).first().text().trim();
    if (phone) return [phone.replace(/\D/g, '')];

    // Fallback: extract from image alt if it contains phone-like pattern
    const altPhone = $('img[alt*="6"], img[alt*="7"]').first().attr('alt');
    if (altPhone) {
      const match = altPhone.match(/[67]\d{8}/);
      if (match) return [match[0]];
    }

    return [];
  }

  protected override extractCity(_$: CheerioAPI): string | undefined {
    return 'Madrid';
  }

  protected extractRates(_$: CheerioAPI): EscortRate[] {
    return [];
  }

  protected extractServices(_$: CheerioAPI): EscortService[] {
    return [];
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);
    const age = this.parseFirstInt(this.extractMetaField($, 'edad'));
    const measurements = this.extractMetaField($, 'medidas');
    const heightCm = this.parseFirstInt(this.extractMetaField($, 'estatura'));
    const weightKg = this.parseFirstInt(this.extractMetaField($, 'peso'));
    const hairColor = this.extractMetaField($, 'cabello');
    const eyeColor = this.extractMetaField($, 'ojos');
    const nationality = this.extractMetaField($, 'nacionalidad');
    const schedule = this.extractMetaField($, 'horarios');

    // Price range
    const rangoSrc = $(this.selectors.priceRangeWidget.selector).next('img').attr('src') ?? '';
    const rangoMatch = rangoSrc.match(/perfil-(\d)\.png/);
    const badges: string[] = [];
    if (rangoMatch) badges.push(`range-${rangoMatch[1]!}`);

    return {
      ...base,
      age: age ?? base.age,
      measurements: measurements ?? base.measurements,
      heightCm: heightCm ?? base.heightCm,
      weightKg: weightKg ?? base.weightKg,
      hairColor: hairColor ?? base.hairColor,
      eyeColor: eyeColor ?? base.eyeColor,
      nationality: nationality ?? base.nationality,
      schedule: schedule ?? base.schedule,
      independent: true,
      verified: base.verified,
      badges: [...new Set([...(base.badges ?? []), ...badges])],
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
    return undefined;
  }
}
