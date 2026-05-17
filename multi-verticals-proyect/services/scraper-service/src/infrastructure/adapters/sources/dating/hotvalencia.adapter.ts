import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/legacy-domain';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name HotValencia
 * @domain hotvalencia.com
 * @technology WordPress / Elementor
 * @protection None
 * @ui_interactors Cookies
 * @auth Login required (listado restringido a miembros)
 * @url_listing /putas-valencia/
 * @url_detail /putas-valencia/{slug}/
 * @extraction_method Playwright + Cheerio
 */
export class HotValenciaAdapter extends DatingBaseAdapter {
  readonly identifier = 'hotvalencia';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: 'h1.entry-title, h1.elementor-heading-title, h1',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: '.elementor-text-editor, .entry-content p',
      expectedType: 'text',
      required: false,
    },
    gallery: {
      selector: '.elementor-image img, .wp-post-image',
      expectedType: 'image-list',
      required: false,
    },
    phone: {
      selector: 'a[href^="tel:"]',
      expectedType: 'exists',
      required: false,
    },
    nextPage: {
      selector: 'a[rel="next"], .next.page-numbers',
      expectedType: 'exists',
      required: false,
    },
    cookies: {
      selector:
        '.wp-consent-accept-all, button.accept-all, #cookie_action_close_header, .cli_action_button',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('hotvalencia.com');
  }

  isProfileUrl(url: string): boolean {
    return (
      url.includes('/putas-valencia/') &&
      new URL(url).pathname.split('/').filter(Boolean).length >= 2
    );
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
    const videoAvailable = $(DatingBaseAdapter.baseSelectors.videoTag.selector).length > 0;
    return {
      ...base,
      videoAvailable,
      independent: true,
      verified: false,
      badges: videoAvailable ? ['video'] : [],
      rates: [],
      services: [],
    };
  }

  extractNextPageUrl(html: string, _baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    return $(this.selectors.nextPage.selector).attr('href') ?? undefined;
  }
}
