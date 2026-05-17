import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/domain';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name EscortAdvisor
 * @domain escort-advisor.xxx
 * @technology Unknown (PHP Custom)
 * @protection Cloudflare WAF
 * @ui_interactors Age gate, Cookies
 * @auth None
 * @url_listing /escorts/{country}/{city}/
 * @url_detail /escorts/{country}/{city}/{slug}/
 * @extraction_method Playwright + Cheerio
 */
export class EscortAdvisorAdapter extends DatingBaseAdapter {
  readonly identifier = 'escort-advisor';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: '.username h2',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: '.data-container .content',
      expectedType: 'text',
      required: false,
    },
    gallery: {
      selector: '.gallery_tray img, .user_image, .banner_image',
      expectedType: 'image-list',
      required: false,
    },
    galleryModal: {
      selector: '#gallery-modal',
      expectedType: 'exists',
      required: false,
    },
    phone: {
      selector: 'a[href^="tel:"], .toogleReview[data-number]',
      expectedType: 'exists',
      required: false,
    },
    price: {
      selector: '.price, .rate-price, [class*="price"]',
      expectedType: 'text',
      required: false,
    },
    city: {
      selector: '[class*="breadcrumb"] a',
      expectedType: 'exists',
      required: false,
    },
    rates: {
      selector: '[class*="rate"] tr, [class*="price"] tr',
      expectedType: 'exists',
      required: false,
    },
    services: {
      selector: '.preferences .info-list li',
      expectedType: 'exists',
      required: false,
    },
    personalInfo: {
      selector: '.personal-info .info-list li',
      expectedType: 'exists',
      required: false,
    },
    verified: {
      selector: '.verified-badge, .icon-ok-circled',
      expectedType: 'exists',
      required: false,
    },
    nextPage: {
      selector: 'a[rel="next"], a.next-page, [aria-label="Next"]',
      expectedType: 'exists',
      required: false,
    },
    ageGate: {
      selector:
        '#age-gate-modal .btn-primary, button:contains("Acceder"), button:contains("ENTRAR"), .age-gate button',
      expectedType: 'exists',
      required: false,
    },
    cookies: {
      selector:
        '#onetrust-accept-btn-handler, .cc-accept-btn, [data-testid="accept-cookies"], button[class*="accept"], #confirm_button',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('escort-advisor.xxx');
  }

  isProfileUrl(url: string): boolean {
    // /escorts/{country}/{city}/{slug}/ — 4+ path segments after domain
    const path = new URL(url).pathname;
    return path.startsWith('/escorts/') && path.split('/').filter(Boolean).length >= 4;
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    return $(this.selectors.title.selector).first().text().trim();
  }

  protected override extractId(url: string, $: CheerioAPI): string {
    // ID is usually at the end of the URL
    const m = url.match(/\/(\d+)$/);
    if (m) return m[1] ?? url;
    // Fallback: data-escortid attribute
    const dataId = $(this.selectors.galleryModal.selector).attr('data-escort_id');
    if (dataId) return dataId;
    return url;
  }

  protected extractTitle($: CheerioAPI): string {
    return $(this.selectors.title.selector).first().text().trim();
  }

  protected extractDescription($: CheerioAPI): string {
    return $(this.selectors.description.selector).text().trim();
  }

  protected override extractPrice($: CheerioAPI): number | undefined {
    const text = $(this.selectors.price.selector).first().text();
    const m = text.match(/(\d+)/);
    return m ? parseInt(m[1] ?? '', 10) : undefined;
  }

  protected override async extractPhones($: CheerioAPI): Promise<string[]> {
    const href = $(this.selectors.phone.selector).first().attr('href');
    if (href?.startsWith('tel:')) return [href.replace('tel:', '')];
    return [];
  }

  protected override extractCity($: CheerioAPI): string | undefined {
    // Breadcrumb: /escorts/spain/madrid/... → city is 3rd segment
    return $(this.selectors.city.selector).eq(2).text().trim() || undefined;
  }

  protected extractRates($: CheerioAPI): EscortRate[] {
    const rates: EscortRate[] = [];
    $(this.selectors.rates.selector).each((_, el) => {
      const cells = $(el).find('td');
      if (cells.length >= 2) {
        const duration = cells.eq(0).text().trim();
        const priceText = cells.eq(1).text().trim();
        const price = parseInt(priceText.match(/(\d+)/)?.[1] ?? '', 10);
        if (duration && !isNaN(price)) {
          rates.push({ duration, incall: price });
        }
      }
    });
    return rates;
  }

  protected extractServices($: CheerioAPI): EscortService[] {
    const services: EscortService[] = [];
    $(this.selectors.services.selector).each((_, el) => {
      const name = $(el).text().trim();
      if (name) services.push({ name, included: true, extra: false });
    });
    return services;
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);
    const getField = (label: string) => {
      return $(this.selectors.personalInfo.selector)
        .filter((_, el) => $(el).text().includes(label))
        .text()
        .split(':')[1]
        ?.trim();
    };

    const age = this.parseFirstInt(getField('Edad'));
    const heightCm = this.parseFirstInt(getField('Altura'));
    const weightKg = this.parseFirstInt(getField('Peso'));
    const nationality = getField('Nacionalidad');
    const ethnicity = getField('Etnia');

    const verified = $(this.selectors.verified.selector).length > 0;

    return {
      ...base,
      age: age ?? base.age,
      heightCm: heightCm ?? base.heightCm,
      weightKg: weightKg ?? base.weightKg,
      nationality: nationality ?? base.nationality,
      ethnicity: ethnicity ?? base.ethnicity,
      verified: verified || base.verified,
      badges:
        verified || (base.badges?.length ?? 0) > 0
          ? [...new Set([...(base.badges ?? []), 'verified'])]
          : (base.badges ?? []),
      independent: true,
      rates: this.extractRates($),
      services: this.extractServices($),
      reviews: [],
    };
  }

  extractNextPageUrl(html: string, baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    return $(this.selectors.nextPage.selector).first().attr('href') ?? undefined;
  }
}
