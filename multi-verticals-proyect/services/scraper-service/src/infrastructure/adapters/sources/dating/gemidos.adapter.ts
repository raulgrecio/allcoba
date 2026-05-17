import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CurrencyCode } from '@allcoba/shared-types';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name Gemidos
 * @domain gemidos.tv
 * @technology Unknown
 * @protection Cloudflare WAF
 * @ui_interactors Age gate, Cookies // NOTA: yo no he visto ni un popup de cookies ni el popup de la edad en la web. REVISAR DE NUEVO.
 * @auth None
 * @url_listing /espana · /{city}
 * @url_detail /anuncio/{slug}/
 * @extraction_method Playwright + CF bypass
 */
export class GemidosAdapter extends DatingBaseAdapter {
  readonly identifier = 'gemidos';
  readonly defaultCountry = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: '.pub-title',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: '.pub-about-full',
      expectedType: 'text',
      required: false,
    },
    gallery: {
      selector: '.pub-picture img, .pub-book-item img, .story img, .cover img, .pub-picture video',
      expectedType: 'image-list',
      required: false,
    },
    phone: {
      selector: '.pub-phone span',
      expectedType: 'text',
      required: false,
    },
    services: {
      selector: '.pub-services .pub-tags-item, .pub-tags-item.pub_services',
      expectedType: 'exists',
      required: false,
    },
    tags: {
      selector: '.pub-tags-item',
      expectedType: 'exists',
      required: false,
    },
    ageTag: {
      selector: '.pub-tags-item.number:contains("Años")',
      expectedType: 'text',
      required: false,
    },
    heightTag: {
      selector: '.pub-tags-item.number:contains("CM")',
      expectedType: 'text',
      required: false,
    },
    weightTag: {
      selector: '.pub-tags-item.number:contains("KG")',
      expectedType: 'text',
      required: false,
    },
    measurementsTag: {
      selector: '.pub-tags-item.number',
      expectedType: 'text',
      required: false,
    },
    verifiedBadge: {
      selector: '.badge-verified, .fa-shield-check',
      expectedType: 'exists',
      required: false,
    },
    nextPage: {
      selector: 'a[rel="next"]',
      expectedType: 'exists',
      required: false,
    },
    cookies: {
      selector:
        '#onetrust-accept-btn-handler, button[class*="accept"], .cc-accept, #cn-accept-cookie, .cookie-notice-accept, #cookie-notice-accept',
      expectedType: 'exists',
      required: false,
    },
    ageGate: {
      selector: '#age-gate-modal button, .btn-age-gate, button:contains("18")',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('gemidos.tv');
  }

  isProfileUrl(url: string): boolean {
    return url.includes('/anuncio/');
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    const title = $(this.selectors.title.selector).text().trim();
    // Usually name is the first word after some emojis or just the first word
    const match = title.match(/^(?:[^\w\s]*\s*)?(\w+)/);
    return match ? match[1] : undefined;
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? url;
  }

  protected extractTitle($: CheerioAPI): string {
    return $(this.selectors.title.selector).text().trim();
  }

  protected extractDescription($: CheerioAPI): string {
    return $(this.selectors.description.selector).text().trim();
  }

  protected override async extractPhones($: CheerioAPI): Promise<string[]> {
    const phones: string[] = [];
    $(this.selectors.phone.selector).each((_, el) => {
      const text = $(el).text().replace(/\D/g, '');
      if (text.length >= 9) phones.push(text);
    });
    return phones;
  }

  protected override extractCity(_$: CheerioAPI): string | undefined {
    return undefined;
  }

  protected extractRates(_$: CheerioAPI): EscortRate[] {
    return [];
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
    const getTagValue = (label: string) => {
      const val = $(this.selectors.tags.selector)
        .filter((_, el) => $(el).find('small').text().toLowerCase().includes(label.toLowerCase()))
        .contents()
        .filter((_, el) => el.type === 'text')
        .text()
        .trim();
      return val || undefined;
    };

    const age = this.parseFirstInt($(this.selectors.ageTag.selector).text());
    const heightCm = this.parseFirstInt($(this.selectors.heightTag.selector).text());
    const weightKg = this.parseFirstInt($(this.selectors.weightTag.selector).text());
    const nationality = getTagValue('Nacionalidad');
    const ethnicity = getTagValue('Piel');
    const measurements = $(this.selectors.measurementsTag.selector)
      .filter((_, el) => /\d+-\d+-\d+/.test($(el).text()))
      .text()
      .trim();

    const verified = $(this.selectors.verifiedBadge.selector).length > 0;

    return {
      ...base,
      age: age ?? base.age,
      heightCm: heightCm ?? base.heightCm,
      weightKg: weightKg ?? base.weightKg,
      nationality: nationality ?? base.nationality,
      ethnicity: ethnicity ?? base.ethnicity,
      measurements: measurements ?? base.measurements,
      verified: verified || base.verified,
      badges:
        verified || (base.badges?.length ?? 0) > 0
          ? [...new Set([...(base.badges ?? []), 'verified'])]
          : (base.badges ?? []),
      independent: true,
      rates: [],
      services: this.extractServices($),
      reviews: [],
    };
  }

  extractNextPageUrl(html: string, _baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    return $(this.selectors.nextPage.selector).attr('href') ?? undefined;
  }
}
