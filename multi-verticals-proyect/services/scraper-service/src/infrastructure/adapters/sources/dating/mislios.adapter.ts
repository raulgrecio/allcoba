import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/legacy-domain';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name Mislios
 * @domain mislios.com
 * @technology WordPress + custom plugin (mislios)
 * @protection None
 * @ui_interactors Cookies // PENDIENTE: SOLO VI LA VERIFICACIÓN DE EDAD DE LA COOKIE NO LO VI
 * @auth None
 * @url_listing /anuncios/
 * @url_detail /anuncios/{slug}/
 * @extraction_method Playwright (listado renderizado por JS / AJAX)
 */
export class MisliosAdapter extends DatingBaseAdapter {
  readonly identifier = 'mislios';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: 'h1, .msl-profile-name',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: '.msl-profile-desc, .profile-text',
      expectedType: 'text',
      required: false,
    },
    gallery: {
      selector: '.msl-gallery img',
      expectedType: 'image-list',
      required: false,
    },
    phone: {
      selector: 'a[href^="tel:"]',
      expectedType: 'exists',
      required: false,
    },
    nextPage: {
      selector: 'a[rel="next"]',
      expectedType: 'exists',
      required: false,
    },
    cookies: {
      selector: '.msl-cookie-accept, button[class*="accept"], #accept-all-cookies',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('mislios.com');
  }

  isProfileUrl(url: string): boolean {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts.length >= 2 && parts[0] === 'anuncios';
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

  extractNextPageUrl(html: string, _baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    return $(this.selectors.nextPage.selector).attr('href') ?? undefined;
  }
}
