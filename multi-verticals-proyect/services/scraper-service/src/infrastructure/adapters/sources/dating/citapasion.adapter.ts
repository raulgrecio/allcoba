import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CurrencyCode } from '@allcoba/shared-types';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { parseWhatsappHref } from '../social-extractor.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name Citapasion
 * @domain citapasion.com
 * @technology PHP / Slick slider SSR
 * @protection None
 * @ui_interactors Age gate, Cookies
 * @auth None
 * @url_listing /escorts/{province}/{city}/
 * @url_detail /escorts/{numericId}
 * @extraction_method Playwright + Cheerio
 */
export class CitapasionAdapter extends DatingBaseAdapter {
  readonly identifier = 'citapasion';
  readonly defaultCountry = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: 'h1',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: '.card-perfil.sobre__mi .text__description',
      expectedType: 'text',
      required: false,
    },
    gallery: {
      selector: '.slider-fichas a[data-fslightbox="gallery"]',
      expectedType: 'image-list',
      required: false,
    },
    phone: {
      selector: '[data-href^="tel:"]',
      expectedType: 'exists',
      required: false,
    },
    whatsapp: {
      selector: '[data-accion*="wa.me"]',
      expectedType: 'exists',
      required: false,
    },
    dataRow: {
      selector: '.card-perfil.datos_interes li',
      expectedType: 'exists',
      required: false,
    },
    languages: {
      selector: '.card-perfil.datos_interes .idiomas__content .item p',
      expectedType: 'exists',
      required: false,
    },
    ratingStars: {
      selector: '.reviews .stars',
      expectedType: 'exists',
      required: false,
    },
    ratingCount: {
      selector: '.reviews span',
      expectedType: 'text',
      required: false,
    },
    nextPage: {
      selector: 'a[rel="next"]',
      expectedType: 'exists',
      required: false,
    },
    ageGate: {
      selector: 'a#aceptar, a.acc-aceptar-18',
      expectedType: 'exists',
      required: false,
    },
    cookies: {
      selector: 'button#aceptar, button[class*="accept"], #accept-cookies',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('citapasion.com');
  }

  isProfileUrl(url: string): boolean {
    // Profile: /escorts/{numericId}  e.g. /escorts/24080
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return (
      parts.length === 2 && parts[0] === 'escorts' && /^\d+$/.test(parts[1]!) && !url.includes('?')
    );
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    // "Nombre:" row in Datos Personales
    const name = this.extractDataRow($, 'Nombre');
    if (name) return name;
    return undefined;
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    return url.split('/').filter(Boolean).pop() ?? url;
  }

  protected extractTitle($: CheerioAPI): string {
    return $(this.selectors.title.selector).first().text().split('|')[0]?.trim() ?? '';
  }

  protected extractDescription($: CheerioAPI): string {
    return $(this.selectors.description.selector).text().trim();
  }

  protected override async extractPhones($: CheerioAPI): Promise<string[]> {
    // Phone is in data-href="tel:+34XXXXXXXXX" on a <p> element (AJAX-revealed)
    const raw = $(this.selectors.phone.selector).first().attr('data-href');
    if (raw) return [raw.replace('tel:', '').replace(/\D/g, '')];
    // Fallback: standard <a href="tel:">
    const href = $('a[href^="tel:"]').first().attr('href');
    if (href) return [href.replace('tel:', '').replace(/\D/g, '')];
    return [];
  }

  protected override extractWhatsapp($: CheerioAPI): string | undefined {
    // WhatsApp URL is in data-accion on enviar-washapp elements
    const raw = $(this.selectors.whatsapp.selector).first().attr('data-accion');
    if (raw) return parseWhatsappHref(raw);
    // Fallback: standard href
    const href = $('a[href*="wa.me"]').first().attr('href');
    return href ? parseWhatsappHref(href) : undefined;
  }

  protected override extractCity($: CheerioAPI): string | undefined {
    return this.extractDataRow($, 'Ciudad');
  }

  protected override extractZone($: CheerioAPI): string | undefined {
    const zone = this.extractDataRow($, 'Zona');
    return zone && zone.trim() !== '' ? zone : undefined;
  }

  protected extractRates(_$: CheerioAPI): EscortRate[] {
    return [];
  }

  protected extractServices(_$: CheerioAPI): EscortService[] {
    return [];
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);
    const tattoos = this.extractDataRow($, 'Tatuajes');
    const piercings = this.extractDataRow($, 'Piercings');
    const smoker = this.extractDataRow($, 'Fumador@');

    const langItems: string[] = [];
    $(this.selectors.languages.selector).each((_, el) => {
      const t = $(el).text().trim();
      if (t) langItems.push(t);
    });

    const siteRating = this.extractSiteRating($);

    return {
      ...base,
      age: this.parseFirstInt(this.extractDataRow($, 'Edad')) ?? base.age,
      heightCm: this.parseFirstInt(this.extractDataRow($, 'Altura')) ?? base.heightCm,
      weightKg: this.parseFirstInt(this.extractDataRow($, 'Peso')) ?? base.weightKg,
      hairColor: this.extractDataRow($, 'Color de pelo') ?? base.hairColor,
      hairLength: this.extractDataRow($, 'Tipo de pelo') ?? base.hairLength,
      eyeColor: this.extractDataRow($, 'Color de ojos') ?? base.eyeColor,
      tattoos: tattoos ? tattoos.toLowerCase() === 'si' : base.tattoos,
      piercings: piercings ? piercings.toLowerCase() === 'si' : base.piercings,
      smoker: smoker ? smoker.toLowerCase() === 'si' : base.smoker,
      ethnicity: this.extractDataRow($, 'Etnia') ?? base.ethnicity,
      nationality: this.extractDataRow($, 'Nacionalidad') ?? base.nationality,
      languages: langItems.length > 0 ? langItems : base.languages,
      independent: true,
      verified: false,
      siteRating,
    };
  }

  private extractSiteRating($: CheerioAPI): { score: number; count: number } | undefined {
    const style = $(this.selectors.ratingStars.selector).first().attr('style') ?? '';
    const scoreMatch = style.match(/--rating:\s*([\d.]+)/);
    if (!scoreMatch) return undefined;
    const score = parseFloat(scoreMatch[1]!);
    const countText = $(this.selectors.ratingCount.selector).first().text().trim();
    const countMatch = countText.match(/\((\d+)\)/);
    const count = countMatch ? parseInt(countMatch[1]!, 10) : 0;
    return { score, count };
  }

  extractNextPageUrl(html: string, _baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    return $(this.selectors.nextPage.selector).attr('href') ?? undefined;
  }

  // Extracts value from <li><span>Label:</span>Value</li> pairs.
  private extractDataRow($: CheerioAPI, label: string): string | undefined {
    let value: string | undefined;
    $(this.selectors.dataRow.selector).each((_, el) => {
      if (value) return;
      const span = $(el).find('span').first();
      const lbl = span.text().replace(':', '').trim();
      if (lbl === label) {
        value = $(el).text().replace(span.text(), '').trim() || undefined;
      }
    });
    return value;
  }
}
