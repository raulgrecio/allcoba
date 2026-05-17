import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CurrencyCode } from '@allcoba/shared-types';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name Nuevapasion
 * @domain nuevapasion.com
 * @technology Bootstrap 5 + PHP
 * @protection None
 * @ui_interactors Age gate, Cookies
 * @auth None
 * @url_listing /escorts/{city}/
 * @url_detail /anuncio/{slug}/
 * @extraction_method Playwright (requerido para saltar popups de edad y cookies)
 */
export class NuevapasionAdapter extends DatingBaseAdapter {
  readonly identifier = 'nuevapasion';
  readonly defaultCountry = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: 'h1, .ad-title, .titulo-anuncio',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: '.descripcion, .anuncio-body, .ad-description',
      expectedType: 'text',
      required: false,
    },
    gallery: {
      selector: '.gallery img, .foto img, .swiper-slide img, meta[property="og:image"]',
      expectedType: 'image-list',
      required: false,
    },
    phone: {
      selector: 'a[href^="tel:"]',
      expectedType: 'exists',
      required: false,
    },
    nextPage: {
      selector: 'a[rel="next"], a.next-page',
      expectedType: 'exists',
      required: false,
    },
    cookies: {
      selector: '#cookieButton, button.btn-accept-all, [data-cc="accept-all"]',
      expectedType: 'exists',
      required: false,
    },
    ageGate: {
      selector: '#edadPopup button.btn-primary',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('nuevapasion.com');
  }

  isProfileUrl(url: string): boolean {
    return url.includes('/anuncio/');
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    return new URL(url).pathname.split('/').filter(Boolean).pop() ?? url;
  }

  protected extractTitle($: CheerioAPI): string {
    return (
      $(this.selectors.title.selector).first().text().trim() ||
      $(DatingBaseAdapter.baseSelectors.titleTag.selector).text().split('|')[0]?.trim() ||
      ''
    );
  }

  protected extractDescription($: CheerioAPI): string {
    return $(this.selectors.description.selector).first().text().trim();
  }

  protected override async extractPhones($: CheerioAPI): Promise<string[]> {
    const href = $(this.selectors.phone.selector).first().attr('href');
    if (href) return [href.replace('tel:', '').replace(/\D/g, '')];
    return [];
  }

  protected extractRates(_$: CheerioAPI): EscortRate[] {
    return [];
  }

  protected extractServices(_$: CheerioAPI): EscortService[] {
    return [];
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    const title = this.extractTitle($);
    return (
      title
        .split(/\s+/)[0]
        ?.replace(/[,;:]+$/, '')
        .trim() || undefined
    );
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);
    return {
      ...base,
      independent: true,
      verified: false,
      badges: [],
      rates: [],
      services: [],
      reviews: [],
    };
  }

  extractNextPageUrl(html: string, _baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    return $(this.selectors.nextPage.selector).attr('href') ?? undefined;
  }
}
