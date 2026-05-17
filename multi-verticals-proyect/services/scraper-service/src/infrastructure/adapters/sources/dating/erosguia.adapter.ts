import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CurrencyCode } from '@allcoba/shared-types';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name Erosguia
 * @domain erosguia.com
 * @technology Laravel + Alpine.js + Tailwind v4
 * @protection None
 * @ui_interactors Cookies // PENDIENTE: DE CAPTURAR EL VERIFICACION DE EDAD O NO ESTA DEFINIDO EL SELECTOR
 * @auth None
 * @url_listing /escorts-{city} · /escorts-espana
 * @url_detail /{id}.html
 * @extraction_method Cheerio (SSR — todo el contenido en HTML estático a pesar de Alpine)
 */
export class ErosguiaAdapter extends DatingBaseAdapter {
  readonly identifier = 'erosguia';
  readonly defaultCountry = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: 'title',
      expectedType: 'text',
      required: true,
    },
    details: {
      selector: '.ficha-info',
      expectedType: 'exists',
      required: false,
    },
    fichaGrid: {
      selector: '.ficha-info .grid',
      expectedType: 'exists',
      required: false,
    },
    gallery: {
      selector: '.ficha-imagenes img, .ficha-row-img img',
      expectedType: 'image-list',
      required: false,
    },
    services: {
      selector: '.ficha-services-container .ficha-services div',
      expectedType: 'exists',
      required: false,
    },
    description: {
      selector: '.ficha-about [x-ref="content"]',
      expectedType: 'text',
      required: false,
    },
    whatsapp: {
      selector: 'a[href*="wa.me"]',
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
        '#onetrust-accept-btn-handler, button[id*="cookie-accept"], button[class*="cookie-accept"], .cookie-consent__button',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('erosguia.com');
  }

  isProfileUrl(url: string): boolean {
    return /\/\d+\.html$/.test(url);
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    const full = $(this.selectors.title.selector).text().trim();
    return full.split(',')[0]?.trim();
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    return new URL(url).pathname.match(/\/(\d+)\.html$/)?.[1] ?? url;
  }

  protected extractTitle($: CheerioAPI): string {
    // Title pattern: "Barby, Escort en Barcelona - 664 708 586 - EROSGUIA"
    return $(this.selectors.title.selector).text().trim();
  }

  protected extractDescription($: CheerioAPI): string {
    // Description is in the "Así es {Name}" section
    return $(this.selectors.description.selector).first().text().trim();
  }

  // Ficha attributes: grid div pairs (label: div.font-semibold, value: sibling div)
  private extractFichaField($: CheerioAPI, label: string): string | undefined {
    const divs = $(this.selectors.fichaGrid.selector).children('div');
    for (let i = 0; i < divs.length; i++) {
      const el = divs.eq(i);
      const labelEl = el.find('.font-semibold').first();
      if (labelEl.text().trim() === label) {
        // Return the first div that is NOT the label
        return el.children('div').not(labelEl).first().text().trim() || undefined;
      }
    }
    return undefined;
  }

  protected override async extractPhones($: CheerioAPI): Promise<string[]> {
    // Phone visible in title "- 664 708 586 -" and in WhatsApp href
    const title = $(this.selectors.title.selector).text();
    const titleMatch = title.match(/- (\d{3} \d{3} \d{3}) -/);
    if (titleMatch) return [titleMatch[1]!.replace(/\s/g, '')];

    const waHref = $(this.selectors.whatsapp.selector).first().attr('href');
    if (waHref) {
      const m = waHref.match(/wa\.me\/34(\d+)/);
      if (m) return [m[1]!];
    }
    return [];
  }

  protected override extractCity($: CheerioAPI): string | undefined {
    const city = this.extractFichaField($, 'Ciudad');
    if (city) return city;
    // Fallback: title "Escort en {city}"
    const m = $(this.selectors.title.selector)
      .text()
      .match(/Escort en ([^-]+)/i);
    return m ? m[1]!.trim() : undefined;
  }

  protected extractRates(_$: CheerioAPI): EscortRate[] {
    return [];
  }

  protected extractServices($: CheerioAPI): EscortService[] {
    const services = new Map<string, EscortService>();
    $(this.selectors.services.selector).each((_, el) => {
      const name = $(el).text().trim();
      if (name && !services.has(name)) {
        services.set(name, { name, included: true, extra: false });
      }
    });
    return Array.from(services.values());
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);
    const nationality = this.extractFichaField($, 'Nacionalidad');
    const age = this.parseFirstInt(this.extractFichaField($, 'Edad'));
    const weightKg = this.parseFirstInt(this.extractFichaField($, 'Peso'));
    const heightCm = this.parseFirstInt(this.extractFichaField($, 'Estatura'));
    const measurements = this.extractFichaField($, 'Medidas');
    const languages = this.extractFichaField($, 'Idiomas')
      ?.split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    return {
      ...base,
      age: age ?? base.age,
      nationality: nationality ?? base.nationality,
      heightCm: heightCm ?? base.heightCm,
      weightKg: weightKg ?? base.weightKg,
      measurements: measurements ?? base.measurements,
      languages: languages ?? base.languages,
      independent: true,
      verified: base.verified,
      badges: base.badges ?? [],
      rates: [],
      services: this.extractServices($),
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
    const pageMatch = baseUrl.match(/[?&]pagina=(\d+)/);
    if (pageMatch) {
      const p = parseInt(pageMatch[1]!, 10) + 1;
      return baseUrl.replace(/pagina=\d+/, `pagina=${p}`);
    }
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}pagina=2`;
  }
}
