import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CurrencyCode } from '@allcoba/shared-types';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { parseWhatsappHref } from '../social-extractor.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name ArdientePlacer
 * @domain ardienteplacer.com
 * @technology Bootstrap 3 / PHP
 * @protection None
 * @ui_interactors Age gate // PENDIENTE: DE CAPTURAR EL OK DE COOKIES O NO ESTA DEFINIDO EL SELECTOR
 * @auth None
 * @url_listing /escorts/{category}
 * @url_detail /escort/{category}/{city}/{phone}/{id}
 * @extraction_method Playwright + Cheerio
 */
export class ArdientePlacer extends DatingBaseAdapter {
  readonly identifier = 'ardienteplacer';
  readonly defaultCountry = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: 'h3#info',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: 'div[style*="word-break: break-word"]',
      expectedType: 'text',
      required: false,
    },
    gallery: {
      selector: 'a[href^="/anuncios/"], img[src^="/anuncios/"]',
      expectedType: 'image-list',
      required: false,
    },
    widgetItems: {
      selector: '.widget.clearfix ul.listawidget li',
      expectedType: 'exists',
      required: false,
    },
    modalPhones: {
      selector: '.modal1 div.tel b',
      expectedType: 'exists',
      required: false,
    },
    postcatblock: {
      selector: 'div.postcatblock',
      expectedType: 'text',
      required: false,
    },
    entryMeta: {
      selector: 'ul.entry-meta li',
      expectedType: 'exists',
      required: false,
    },
    services: {
      selector: 'h5.titulo ~ ul.list-unstyled li',
      expectedType: 'exists',
      required: false,
    },
    flags: {
      selector: 'ul.entry-meta img[src*="/images/flags/"]',
      expectedType: 'exists',
      required: false,
    },
    whatsapp: {
      selector: '.modal1 a[href*="wa.me"]',
      expectedType: 'exists',
      required: false,
    },
    nextPage: {
      selector: 'a[rel="next"], .pagination a.next',
      expectedType: 'exists',
      required: false,
    },
    ageGate: {
      selector:
        'button:contains("Soy mayor"), a:contains("Soy mayor"), button:contains("Tengo más de 18"), .btn-18, #btn-mayores, #acepto-18',
      expectedType: 'exists',
      required: false,
    },
    cookies: {
      selector:
        '#onetrust-accept-btn-handler, button.accept-cookies, [class*="cookie"] button[class*="accept"]',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('ardienteplacer.com');
  }

  isProfileUrl(url: string): boolean {
    // /escort/{category}/{city}/{phone}/{id}
    return /\/escort\/[^/]+\/[^/]+\/\d+\/\d+$/.test(url);
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    const widgetName = $(this.selectors.widgetItems.selector).first().text().trim();
    if (widgetName && !/años|Madrid|Barcelona|\d/.test(widgetName)) return widgetName;
    return undefined;
  }

  protected extractId(url: string): string {
    return new URL(url).pathname.split('/').pop() ?? url;
  }

  protected extractTitle($: CheerioAPI): string {
    const h3 = $(this.selectors.title.selector).first().text().trim();
    if (h3) return h3;
    return (
      $(DatingBaseAdapter.baseSelectors.h1Tag.selector)
        .first()
        .text()
        .trim()
        .split(' - ')[0]
        ?.trim() ?? ''
    );
  }

  protected extractDescription($: CheerioAPI): string {
    const div = $(this.selectors.description.selector).first();
    // Remove the nested "Recuerda mencionar..." toplistingblock
    div.find('.toplistingblock').remove();
    return div.text().trim();
  }

  protected override async extractPhones($: CheerioAPI, url?: string): Promise<string[]> {
    // Phones are in the static modal HTML: .modal1 div.tel b
    const phones: string[] = [];
    $(this.selectors.modalPhones.selector).each((_, el) => {
      const raw = $(el).text().replace(/\D/g, '');
      if (raw.length >= 9) phones.push(raw.slice(-9));
    });
    if (phones.length > 0) return phones;
    // Fallback: 4th path segment in URL
    if (url) {
      const parts = new URL(url).pathname.split('/').filter(Boolean);
      if (parts.length >= 4 && /^\d{9,}$/.test(parts[3]!)) return [parts[3]!];
    }
    return [];
  }

  protected override extractCity($: CheerioAPI, url?: string): string | undefined {
    // widget: ul.listawidget li → "Madrid, Madrid" → city before comma
    let city: string | undefined;
    $(this.selectors.widgetItems.selector).each((_, el) => {
      if (city) return;
      const text = $(el).text().trim();
      if (text.includes(',') && !/años/.test(text)) {
        city = text.split(',')[0]?.trim();
      }
    });
    if (city) return city;
    // Fallback: div.postcatblock → "Mujeres en Madrid (Madrid)"
    const label = $(this.selectors.postcatblock.selector).first().text().trim();
    if (label) {
      const m = label.match(/en\s+(.+?)(?:\s*\(|$)/i);
      if (m) return m[1]!.trim();
    }
    if (url) {
      const parts = new URL(url).pathname.split('/').filter(Boolean);
      if (parts.length >= 3) return parts[2]!.replace(/-/g, ' ');
    }
    return undefined;
  }

  protected override transformImageUrl(url: string): string {
    if (url.includes('-m.jpg') || url.includes('-s.jpg')) return '';
    return url;
  }

  protected extractRates($: CheerioAPI): EscortRate[] {
    // "100 €/hora" in ul.entry-meta li
    const rates: EscortRate[] = [];
    $(this.selectors.entryMeta.selector).each((_, el) => {
      const text = $(el).text().trim();
      const m = text.match(/^(\d+)\s*€\/(hora|h)\b/i);
      if (m) rates.push({ duration: '1h', incall: parseInt(m[1]!, 10) });
    });
    return rates;
  }

  protected extractServices($: CheerioAPI): EscortService[] {
    const services: EscortService[] = [];
    // h5.titulo "Servicios" + ul.list-unstyled li
    const servicesSection = $('h5.titulo:contains("Servicios")').next('ul.list-unstyled');
    servicesSection.find('li').each((_, li) => {
      const name = $(li).text().trim();
      if (name) services.push({ name, included: true, extra: false });
    });
    return services;
  }

  protected override extractWhatsapp($: CheerioAPI): string | undefined {
    const href = $(this.selectors.whatsapp.selector).first().attr('href');
    return href ? parseWhatsappHref(href) : undefined;
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);

    // Nationality flag alt: "De España" → "España"
    let nationality: string | undefined;
    const flagAlt = $(this.selectors.flags.selector).first().attr('alt');
    if (flagAlt) nationality = flagAlt.replace(/^De\s+/i, '').trim();

    // Age: widget "20 años" or entry-meta "45 años"
    let age: number | undefined;
    $(`${this.selectors.widgetItems.selector}, ${this.selectors.entryMeta.selector}`).each(
      (_, el) => {
        if (age) return;
        const m = $(el)
          .text()
          .trim()
          .match(/^(\d+)\s+años$/i);
        if (m) age = parseInt(m[1]!, 10);
      },
    );

    return {
      ...base,
      age: age ?? base.age,
      nationality: nationality ?? base.nationality,
      independent: true,
      verified: false,
      badges: [],
      rates: this.extractRates($),
      services: this.extractServices($),
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
    const pageMatch = baseUrl.match(/[?&]pagina=(\d+)/);
    if (pageMatch) {
      const p = parseInt(pageMatch[1]!, 10) + 1;
      return baseUrl.replace(/pagina=\d+/, `pagina=${p}`);
    }
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}pagina=2`;
  }

  protected override async onBeforeCapture(page: any): Promise<void> {
    try {
      const btn = page.locator(this.selectors.ageGate.selector).first();
      if (await btn.isVisible({ timeout: 3000 })) {
        await btn.click();
        await page.waitForTimeout(500);
      }
    } catch {
      /* no age gate visible */
    }
  }
}
