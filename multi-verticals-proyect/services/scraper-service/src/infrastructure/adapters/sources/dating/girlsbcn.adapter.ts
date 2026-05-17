import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/domain';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name GirlsBCN
 * @domain girlsbcn.net · girlsbcn.com
 * @technology PHP SSR
 * @protection None
 * @ui_interactors Age gate, Cookies // TODO: Revisar si son necesarios. yo no lo he visto
 * @auth None
 * @url_listing /escorts-girl/
 * @url_detail /escort/{slug}.html
 * @extraction_method Playwright + Cheerio
 */
export class GirlsBCNAdapter extends DatingBaseAdapter {
  readonly identifier = 'girlsbcn';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: 'h1.css_escort',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: 'p.texto.css_escort',
      expectedType: 'text',
      required: false,
    },
    gallery: {
      selector: 'p.foto.css_escort img, img.foto.css_escort, .fondo_ficha',
      expectedType: 'image-list',
      required: false,
    },
    phone: {
      selector: 'a[href^="tel:"]',
      expectedType: 'exists',
      required: false,
    },
    details: {
      selector: 'dl.dl-horizontal',
      expectedType: 'exists',
      required: false,
    },
    video: {
      selector: 'video.css_escort',
      expectedType: 'exists',
      required: false,
    },
    videoSource: {
      selector: 'video.css_escort source[src]',
      expectedType: 'exists',
      required: false,
    },
    fondoFicha: {
      selector: '.fondo_ficha',
      expectedType: 'exists',
      required: false,
    },
    priceRangeImg: {
      selector: 'p.rango.css_escort img',
      expectedType: 'exists',
      required: false,
    },
    nextPage: {
      selector: 'a[rel="next"], a.nextpostslink, .pagination a.next',
      expectedType: 'exists',
      required: false,
    },
    ageGate: {
      selector:
        '.aviso a:contains("legal"), #modal-aviso button, a:contains("ENTRAR"), button:contains("Aceptar")',
      expectedType: 'exists',
      required: false,
    },
    cookies: {
      selector:
        '#onetrust-accept-btn-handler, .cc-btn.save, button.accept-all, #accept-cookies, .ok-cookies',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('girlsbcn.net') || url.includes('girlsbcn.com');
  }

  isProfileUrl(url: string): boolean {
    return /\/escort\/[^/]+\.html/.test(url);
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    return $(this.selectors.title.selector).first().text().trim();
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    const filename = new URL(url).pathname.split('/').filter(Boolean).pop() ?? url;
    return filename.replace('.html', '');
  }

  protected extractTitle($: CheerioAPI): string {
    return $(this.selectors.title.selector).first().text().trim();
  }

  protected extractDescription($: CheerioAPI): string {
    return $(this.selectors.description.selector).first().text().trim();
  }

  private extractDlField($: CheerioAPI, label: string): string | undefined {
    const dts = $(this.selectors.details.selector).find('dt');
    for (let i = 0; i < dts.length; i++) {
      if (dts.eq(i).text().trim().replace(/:$/, '') === label) {
        return dts.eq(i).next('dd').text().trim() || undefined;
      }
    }
    return undefined;
  }

  protected override async extractPhones($: CheerioAPI): Promise<string[]> {
    const href = $(this.selectors.phone.selector).first().attr('href');
    if (href) return [href.replace('tel:', '').replace(/\D/g, '')];
    // Phone sometimes in img alt as "632911734" or "632-911-734"
    for (const el of $(this.selectors.gallery.selector).toArray()) {
      const alt = $(el).attr('alt') ?? '';
      if (/^\d{3}[\s-]?\d{3}[\s-]?\d{3}$/.test(alt)) {
        return [alt.replace(/[\s-]/g, '')];
      }
    }
    return [];
  }

  protected override extractCity($: CheerioAPI): string | undefined {
    // "Estoy disponible en: Barcelona."
    const available = $(this.selectors.description.selector)
      .filter((_, el) => $(el).text().includes('disponible en'))
      .first()
      .text();
    const m = available.match(/disponible en:\s*([^.]+)/i);
    return m ? m[1]!.trim() : undefined;
  }

  protected extractRates(_$: CheerioAPI): EscortRate[] {
    return [];
  }

  protected extractServices(_$: CheerioAPI): EscortService[] {
    return [];
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);
    const age = this.parseFirstInt(this.extractDlField($, 'Edad'));
    const measurements = this.extractDlField($, 'Medidas');
    const heightCm = this.parseFirstInt(this.extractDlField($, 'Estatura'));
    const weightKg = this.parseFirstInt(this.extractDlField($, 'Peso'));
    const hairColor = this.extractDlField($, 'Cabello');
    const eyeColor = this.extractDlField($, 'Ojos');
    const nationality = this.extractDlField($, 'Nacionalidad');
    const schedule = this.extractDlField($, 'Horarios');

    const videoAvailable = $(this.selectors.videoSource.selector).length > 0;

    // Price range: rango img filename "perfil-N.png" (1-5 scale)
    const rangoSrc = $(this.selectors.priceRangeImg.selector).first().attr('src') ?? '';
    const rangoMatch = rangoSrc.match(/perfil-(\d)\.png/);
    const priceRange = rangoMatch ? parseInt(rangoMatch[1]!, 10) : undefined;

    const badges: string[] = [];
    if (videoAvailable) badges.push('video');
    if (priceRange) badges.push(`range-${priceRange}`);

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
      videoAvailable: videoAvailable || base.videoAvailable,
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
