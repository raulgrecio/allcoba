import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CurrencyCode } from '@allcoba/shared-types';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name Destacamos
 * @domain destacamos.net
 * @technology PHP SSR
 * @protection None
 * @ui_interactors Age gate // PENDIENTE: CAPTURAR EL OK DE COOKIES O NO ESTA DEFINIDO EL SELECTOR
 * @auth None
 * @url_listing /list.html
 * @url_detail /details.html
 * @extraction_method Playwright + Cheerio
 */
export class DestacamosAdapter extends DatingBaseAdapter {
  readonly identifier = 'destacamos';
  readonly defaultCountry = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: 'h1.hh1',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: '#description p:first-child',
      expectedType: 'text',
      required: false,
    },
    details: {
      selector: '#details',
      expectedType: 'exists',
      required: true,
    },
    gallery: {
      selector: '#gallery a.fimage',
      expectedType: 'image-list',
      required: false,
    },
    phone: {
      selector: '#detallesimportantes a[href^="tel:"]',
      expectedType: 'exists',
      required: false,
    },
    nextPage: {
      selector: 'div.paginator a[rel="next"]',
      expectedType: 'exists',
      required: false,
    },
    ageGate: {
      selector: 'a[onclick*="esconderMsgVerificacion"], a[role="button"]:contains("Aceptar")',
      expectedType: 'exists',
      required: false,
    },
    premiumBadge: {
      selector: '.premiumdet',
      expectedType: 'exists',
      required: false,
    },
    topBadge: {
      selector: '.topdet',
      expectedType: 'exists',
      required: false,
    },
    detailRow: {
      selector: '#details div',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('destacamos.net');
  }

  isProfileUrl(url: string): boolean {
    return url.includes('details.html');
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    return $(this.selectors.title.selector).text().trim();
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    const m = url.match(/\/(\d+)-/) || url.match(/\/opiniones\/(\d+)/);
    return m ? m[1]! : (url.split('/').filter(Boolean).pop() ?? url);
  }

  protected extractTitle($: CheerioAPI): string {
    return $(this.selectors.title.selector).text().trim();
  }

  protected extractDescription($: CheerioAPI): string {
    return $(this.selectors.description.selector).first().text().trim();
  }

  protected extractRates(_$: CheerioAPI): EscortRate[] {
    return [];
  }

  protected extractServices(_$: CheerioAPI): EscortService[] {
    return [];
  }

  // destacamos uses #details div > span + br + strong
  private extractDetailField($: CheerioAPI, label: string): string | undefined {
    const divs = $(this.selectors.detailRow.selector);
    for (let i = 0; i < divs.length; i++) {
      const el = divs[i];
      if (el && $(el).find('> span').first().text().trim() === label) {
        return $(el).find('strong').text().trim() || undefined;
      }
    }
    return undefined;
  }

  // "entre 1'60 y 1'70" → 160
  private parseHeightCm(raw: string | undefined): number | undefined {
    if (!raw) return undefined;
    const m = raw.match(/(\d+)'(\d{2})/);
    return m ? parseInt(m[1]!, 10) * 100 + parseInt(m[2]!, 10) : undefined;
  }

  protected override extractCity($: CheerioAPI): string | undefined {
    return this.extractDetailField($, 'Ciudad');
  }

  protected override extractZone($: CheerioAPI): string | undefined {
    return this.extractDetailField($, 'Zona');
  }

  protected override extractPostalCode($: CheerioAPI): string | undefined {
    return this.extractDetailField($, 'Código postal');
  }

  protected override async extractPhones($: CheerioAPI): Promise<string[]> {
    const href = $(this.selectors.phone.selector).attr('href');
    if (!href) return [];
    return [href.replace('tel:', '')];
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);
    const age = this.parseFirstInt(this.extractDetailField($, 'Edad'));
    const nationality = this.extractDetailField($, 'Nacionalidad');
    const hairColor = this.extractDetailField($, 'Color de pelo');
    const heightCm = this.parseHeightCm(this.extractDetailField($, 'Altura'));

    const languages = this.extractDetailField($, 'Idiomas')
      ?.split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    const schedule = this.extractDetailField($, 'Horario');
    const availability = this.extractDetailField($, 'Disponibilidad')
      ?.split('-')
      .map((d) => d.trim())
      .filter(Boolean);

    const badges: string[] = [];
    if ($(this.selectors.premiumBadge.selector).length > 0) badges.push('premium');
    $(this.selectors.topBadge.selector).each((_, el) => {
      const label = $(el).text().trim();
      if (label) badges.push(label.toLowerCase());
    });

    return {
      ...base,
      age: age ?? base.age,
      nationality: nationality ?? base.nationality,
      hairColor: hairColor ?? base.hairColor,
      heightCm: heightCm ?? base.heightCm,
      languages: languages ?? base.languages,
      schedule,
      availability,
      badges,
      independent: false,
    };
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

  extractNextPageUrl(html: string, _baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    return $(this.selectors.nextPage.selector).attr('href') ?? undefined;
  }
}
