import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/legacy-domain';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { parseInstagramHref, parseTelegramHref, parseWhatsappHref } from '../social-extractor.js';
import { SERVICE_LOCATION_KEYWORDS } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name Bluemove
 * @domain bluemove.es
 * @technology Bootstrap 5 / Swiper SSR
 * @protection None
 * @ui_interactors Age gate, Cookies
 * @auth None
 * @url_listing /{city}/escorts/
 * @url_detail /{city}/escorts/#{id}
 * @extraction_method Playwright + Cheerio
 */
export class BluemoveAdapter extends DatingBaseAdapter {
  readonly identifier = 'bluemove';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: '#fichaContent .ficha-images-slider img',
      expectedType: 'exists',
      required: true,
    },
    description: {
      selector: '#fichaContent .ad-description-text',
      expectedType: 'text',
      required: false,
    },
    phone: {
      selector: '#phoneCallSection a[href^="tel:"]',
      expectedType: 'exists',
      required: false,
    },
    whatsapp: {
      selector: '#phoneCallSection a[href*="wa.me"]',
      expectedType: 'exists',
      required: false,
    },
    telegram: {
      selector: '#phoneCallSection a[href*="t.me"]',
      expectedType: 'exists',
      required: false,
    },
    socialLinks: {
      selector: '#fichaContent .ficha-social-media a',
      expectedType: 'exists',
      required: false,
    },
    fichaDataRow: {
      selector: '#fichaContent .ficha-data-row',
      expectedType: 'exists',
      required: false,
    },
    gallery: {
      selector: '#fichaContent .ficha-images-slider img',
      expectedType: 'image-list',
      required: false,
    },
    services: {
      selector: '#fichaContent #services ul:not(.not-services) li a',
      expectedType: 'exists',
      required: false,
    },
    extraInfo: {
      selector: '#fichaContent #extra-info .not-services li a',
      expectedType: 'exists',
      required: false,
    },
    verified: {
      selector:
        '#fichaContent .ficha-top-line img[src*="verificada"], #fichaContent .ficha-verified-images-info',
      expectedType: 'exists',
      required: false,
    },
    servicesTitle: {
      selector: '#fichaContent #services h4',
      expectedType: 'text',
      required: false,
    },
    profileCards: {
      selector: '[data-ficha-id]',
      expectedType: 'exists',
      required: false,
    },
    nextPage: {
      selector: 'a[rel="next"]',
      expectedType: 'exists',
      required: false,
    },
    ageGate: {
      selector: '.adult-banner button, #adult-banner-accept, button:contains("Soy mayor de edad")',
      expectedType: 'exists',
      required: false,
    },
    cookies: {
      selector:
        '#adult-banner-accept, button[class*="accept"], .adult-banner button, .cookie-consent-accept',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('bluemove.es');
  }

  isProfileUrl(url: string): boolean {
    // Profile = listing URL with hash fragment #<numeric id>
    return /#\d+$/.test(url);
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    // First image alt: "BEATRIZ, Escort en Madrid 678797126" → title-case name
    const alt = $(this.selectors.title.selector).first().attr('alt') ?? '';
    const raw = alt.split(',')[0]?.trim() ?? '';
    if (raw) {
      return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    }
    // Fallback: "Servicios de Beatriz" h4
    const h4 = $(this.selectors.servicesTitle.selector).text().trim();
    const m = h4.match(/Servicios de (.+)/i);
    return m ? m[1]!.trim() : undefined;
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    return new URL(url).hash.slice(1);
  }

  protected extractTitle($: CheerioAPI): string {
    const alt = $(this.selectors.title.selector).first().attr('alt');
    if (alt) return alt.trim();
    return this.extractNickname($, '') ?? '';
  }

  protected extractDescription($: CheerioAPI): string {
    return $(this.selectors.description.selector).text().trim();
  }

  protected override async extractPhones($: CheerioAPI): Promise<string[]> {
    const href = $(this.selectors.phone.selector).first().attr('href');
    if (href) return [href.replace('tel:', '').replace(/\D/g, '')];
    return [];
  }

  protected override extractWhatsapp($: CheerioAPI): string | undefined {
    const href = $(this.selectors.whatsapp.selector).first().attr('href');
    return href ? parseWhatsappHref(href) : undefined;
  }

  protected override extractTelegram($: CheerioAPI): string | undefined {
    const href = $(this.selectors.telegram.selector).first().attr('href');
    return href ? parseTelegramHref(href) : undefined;
  }

  protected override extractInstagram($: CheerioAPI): string | undefined {
    const href = $(this.selectors.socialLinks.selector)
      .filter('[href*="instagram.com"]')
      .first()
      .attr('href');
    return href ? parseInstagramHref(href) : undefined;
  }

  protected override extractCity($: CheerioAPI, url?: string): string | undefined {
    // ficha-data-row "Ciudad": "Madrid (Madrid)" → strip province in parens
    const city = this.extractFichaDataRow($, 'Ciudad');
    if (city) return city.replace(/\s*\([^)]*\)/, '').trim();
    // Fallback: /{city}/escorts/ in URL path
    if (url) {
      const parts = new URL(url).pathname.split('/').filter(Boolean);
      const escIdx = parts.indexOf('escorts');
      if (escIdx >= 1) return parts[escIdx - 1]!.replace(/-/g, ' ');
    }
    return undefined;
  }

  protected override extractZone($: CheerioAPI): string | undefined {
    return this.extractFichaDataRow($, 'Areas');
  }

  protected extractRates(_$: CheerioAPI): EscortRate[] {
    return [];
  }

  protected extractServices($: CheerioAPI): EscortService[] {
    const services: EscortService[] = [];
    // Exclude .not-services (extra-info: contact channels, locations, payments)
    $(this.selectors.services.selector).each((_, el) => {
      const name = $(el).text().trim();
      if (name) services.push({ name, included: true, extra: false });
    });
    return services;
  }

  private extractNotServices($: CheerioAPI): {
    paymentMethods: string[];
    serviceLocations: string[];
  } {
    // Known contact channels (already captured via extractContacts) — skip
    const CONTACTS = new Set([
      'whatsapp',
      'telegram',
      'instagram',
      'tiktok',
      'twitter',
      'x',
      'onlyfans',
      'fansly',
    ]);
    const PAYMENTS = new Set(['bizum', 'efectivo', 'tarjeta', 'transferencia', 'paypal', 'crypto']);

    const paymentMethods: string[] = [];
    const serviceLocations: string[] = [];

    $(this.selectors.extraInfo.selector).each((_, el) => {
      const raw = $(el).text().trim();
      const key = raw.toLowerCase();
      if (CONTACTS.has(key)) return;
      if (PAYMENTS.has(key)) paymentMethods.push(raw);
      else if (SERVICE_LOCATION_KEYWORDS.has(key)) serviceLocations.push(raw);
    });

    return { paymentMethods, serviceLocations };
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);
    const age = this.parseFirstInt(this.extractFichaDataRow($, 'Edad'));
    const nationality = this.extractFichaDataRow($, 'Nacionalidad');
    const languages = this.extractFichaDataRow($, 'Idiomas')
      ?.split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    const heightCm = this.parseFirstInt(
      this.extractFichaDataRow($, 'Estatura') || this.extractFichaDataRow($, 'Altura'),
    );
    const weightKg = this.parseFirstInt(this.extractFichaDataRow($, 'Peso'));
    const hairColor =
      this.extractFichaDataRow($, 'Color de pelo') || this.extractFichaDataRow($, 'Cabello');
    const eyeColor = this.extractFichaDataRow($, 'Color de ojos');
    const breastSize = this.extractFichaDataRow($, 'Pecho');
    const pubicHair = this.extractFichaDataRow($, 'Pubis');

    const tattoosRaw = this.extractFichaDataRow($, 'Tatuajes');
    const tattoos = tattoosRaw ? !/no/i.test(tattoosRaw) : undefined;

    const piercingsRaw = this.extractFichaDataRow($, 'Piercings');
    const piercings = piercingsRaw ? !/no/i.test(piercingsRaw) : undefined;

    const verified = $(this.selectors.verified.selector).length > 0;

    const { paymentMethods, serviceLocations } = this.extractNotServices($);

    return {
      ...base,
      age: age ?? base.age,
      nationality: nationality ?? base.nationality,
      languages: languages ?? base.languages,
      heightCm: heightCm ?? base.heightCm,
      weightKg: weightKg ?? base.weightKg,
      hairColor,
      eyeColor,
      breastSize,
      pubicHair,
      tattoos,
      piercings,
      independent: true,
      verified,
      rates: [],
      services: this.extractServices($),
      paymentMethods: paymentMethods.length > 0 ? paymentMethods : undefined,
      serviceLocations: serviceLocations.length > 0 ? serviceLocations : undefined,
    };
  }

  // Profile links are NOT <a href> — cards use data-ficha-id. Construct #{id} URLs.
  override extractProfileLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const listingBase = baseUrl.split('#')[0]!;
    const ids = new Set<string>();
    $(this.selectors.profileCards.selector).each((_, el) => {
      const id = $(el).attr('data-ficha-id');
      if (id && /^\d+$/.test(id)) ids.add(id);
    });
    return Array.from(ids).map((id) => `${listingBase}#${id}`);
  }

  extractNextPageUrl(html: string, _baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    return $(this.selectors.nextPage.selector).attr('href') ?? undefined;
  }

  protected override async onBeforeCapture(page: any): Promise<void> {
    try {
      const btn = page.locator(this.selectors.ageGate.selector).first();
      if (await btn.isVisible({ timeout: 3000 })) {
        await btn.click();
        await page.waitForTimeout(500);
      }
    } catch {
      /* no age gate */
    }
  }

  // Extracts value from ficha-data-row pairs by label text.
  private extractFichaDataRow($: CheerioAPI, label: string): string | undefined {
    let value: string | undefined;
    $(this.selectors.fichaDataRow.selector).each((_, el) => {
      if (value) return;
      const lbl = $(el).find('.ficha-data-row-label span').text().trim();
      if (lbl === label) {
        value = $(el).find('.ficha-data-row-value').text().trim() || undefined;
      }
    });
    return value;
  }
}
