import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/legacy-domain';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name Loquosex
 * @domain loquosex.com
 * @technology PHP SSR
 * @protection None
 * @ui_interactors Cookies
 * @auth None
 * @url_listing /escorts-{city}
 * @url_detail /{slug}-{phone}.html
 * @extraction_method Playwright + Cheerio
 */
export class LoquosexAdapter extends DatingBaseAdapter {
  readonly identifier = 'loquosex';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: 'article h1',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: '.anuntis',
      expectedType: 'text',
      required: false,
    },
    phone: {
      selector: '.numero-telefono',
      expectedType: 'text',
      required: false,
    },
    price: {
      selector: '.precio-minimo',
      expectedType: 'text',
      required: false,
    },
    gallery: {
      selector: '.caja-fotos img',
      expectedType: 'image-list',
      required: false,
    },
    services: {
      selector: 'ul[class^="servicios-"]',
      expectedType: 'exists',
      required: false,
    },
    characteristics: {
      selector: 'ul[class^="caracteristicas-detalle"] li',
      expectedType: 'exists',
      required: false,
    },
    nextPage: {
      selector: 'a.nextpostslink',
      expectedType: 'exists',
      required: false,
    },
    cookies: {
      selector: '#cn-accept-cookie, .cookie-notice-accept, #cookie-notice-accept',
      expectedType: 'exists',
      required: false,
    },
    premiumTitle: {
      selector: 'p.cabecera-titulo',
      expectedType: 'text',
      required: false,
    },
    fallbackPhone: {
      selector: 'a[href^="tel:"]',
      expectedType: 'exists',
      required: false,
    },
    serviceIconList: {
      selector: 'ul[class^="si-no-"]',
      expectedType: 'exists',
      required: false,
    },
    serviceNameList: {
      selector: 'ul[class^="servicios-"]',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('loquosex.com');
  }

  isProfileUrl(url: string): boolean {
    return url.includes('.html') && !url.includes('/page/');
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    const title = $(this.selectors.title.selector).text().trim();
    // Usually the name is the first word before the phone or special chars
    const firstWord = title.split(/[\s,]+/)[0];
    return firstWord || undefined;
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    // URL: /titulo-del-anuncio-XXXXXXXXX.html/ → phone is the ID
    const m = url.match(/(\d{9,})[^/]*\.html/);
    return m ? m[1]! : (url.split('/').filter(Boolean).pop() ?? url);
  }

  protected extractTitle($: CheerioAPI): string {
    return (
      $(this.selectors.title.selector).text().trim() ||
      $(DatingBaseAdapter.baseSelectors.h1Tag.selector).first().text().trim()
    );
  }

  protected extractDescription($: CheerioAPI): string {
    return $(this.selectors.description.selector).text().trim();
  }

  protected override extractPrice($: CheerioAPI): number | undefined {
    const text = $(this.selectors.price.selector).text().trim();
    const m = text.match(/(\d+)/);
    return m ? parseInt(m[1]!, 10) : undefined;
  }

  protected override async extractPhones($: CheerioAPI): Promise<string[]> {
    // Phone visible without JS: plain text in .numero-telefono
    const raw = $(this.selectors.phone.selector).text().trim().replace(/\s/g, '');
    if (raw.match(/^\d{9,}$/)) return [raw];
    // Fallback: tel: href
    const href = $(this.selectors.fallbackPhone.selector).first().attr('href');
    if (href) return [href.replace('tel:', '')];
    return [];
  }

  protected override extractCity($: CheerioAPI): string | undefined {
    // Localidad: Region - Province - City - District  (breadcrumb links)
    const localidadLi = $(this.selectors.characteristics.selector).filter((_, el) =>
      $(el).text().includes('Localidad:'),
    );
    // Get the deepest link (last city level: Capital or District)
    const links = localidadLi.find('a');
    // 3rd link = city (e.g. "Madrid Capital"), 2nd = province
    const city = links.eq(2).text().trim() || links.eq(1).text().trim();
    return city || undefined;
  }

  protected override extractZone($: CheerioAPI): string | undefined {
    const localidadLi = $(this.selectors.characteristics.selector).filter((_, el) =>
      $(el).text().includes('Localidad:'),
    );
    const links = localidadLi.find('a');
    // 4th link = district/zone
    return links.eq(3).text().trim() || undefined;
  }

  protected override transformImageUrl(url: string): string {
    return url.split('?')[0] ?? url;
  }

  protected extractRates(_$: CheerioAPI): EscortRate[] {
    return [];
  }

  protected extractServices($: CheerioAPI): EscortService[] {
    const services: EscortService[] = [];

    const iconLists = $(this.selectors.serviceIconList.selector).toArray();
    const nameLists = $(this.selectors.serviceNameList.selector).toArray();

    iconLists.forEach((iconList, colIdx) => {
      const nameList = nameLists[colIdx];
      if (!nameList) return;

      const icons = $(iconList).find('li img').toArray();
      const names = $(nameList).find('li').toArray();

      icons.forEach((img, i) => {
        const alt = $(img).attr('alt') ?? '';
        const name = $(names[i]).text().trim();
        if (!name) return;
        const included = /\sSI$/i.test(alt);
        services.push({ name, included, extra: false });
      });
    });

    return services;
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);
    const characteristics = $(this.selectors.characteristics.selector);

    // Age from <li>Edad: X años</li>
    const age = this.parseFirstInt(
      characteristics.filter((_, el) => $(el).text().includes('Edad:')).text(),
    );

    // Nationality from <li>Nacionalidad: Latina</li>
    const nationality =
      characteristics
        .filter((_, el) => $(el).text().includes('Nacionalidad:'))
        .text()
        .replace('Nacionalidad:', '')
        .trim() || undefined;

    // Category
    const category =
      characteristics
        .filter((_, el) => $(el).text().includes('Categoría:'))
        .find('a')
        .first()
        .text()
        .trim() || undefined;

    const isPremium = $(this.selectors.premiumTitle.selector)
      .text()
      .toLowerCase()
      .includes('premium');

    return {
      ...base,
      age: age ?? base.age,
      nationality: nationality ?? base.nationality,
      profession: category ?? base.profession,
      independent: true,
      verified: false,
      badges: isPremium ? ['premium'] : base.badges,
      services: this.extractServices($),
    };
  }

  extractNextPageUrl(html: string, _baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    return $(this.selectors.nextPage.selector).attr('href') ?? undefined;
  }
}
