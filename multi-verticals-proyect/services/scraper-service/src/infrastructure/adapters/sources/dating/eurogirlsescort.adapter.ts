import type { CheerioAPI } from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/domain';

import type { SecurityStrategy } from '#application/ports/crawler.port.js';
import { CrawlerEngine, ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.js';
import { resolveCountryCode } from '#infrastructure/utils/country-resolver.js';

import type { SelectorDef } from '../base-source.adapter.js';
import type { EscortRate, EscortReview, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name EuroGirlsEscort
 * @domain eurogirlsescort.com · eurogirlsescort.es
 * @technology PHP Custom
 * @protection None
 * @ui_interactors Age gate, Phone reveal (click)
 * @auth None
 * @url_listing /escorts/{country}/{city}/
 * @url_detail /escort/{country}/{city}/{nickname}/{id}/
 * @extraction_method Playwright + Cheerio
 */
export class EuroGirlsEscortAdapter extends DatingBaseAdapter {
  readonly identifier = 'eurogirlsescort';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override getSecurityStrategy(): SecurityStrategy {
    return {
      engine: CrawlerEngine.PATCHRIGHT,
      proxyStrategy: ProxyStrategy.PROXY, // Forzamos Zyte para este portal
      solverStrategy: SolverStrategy.SOLVER,
      sessionProfile: 'eurogirlsescort',
    };
  }

  protected override readonly selectors = {
    title: {
      selector: '.description h1',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: '.description p.js-more',
      expectedType: 'text',
      required: false,
    },
    address: {
      selector: '.params div',
      expectedType: 'exists',
      required: false,
    },
    gallery: {
      selector: '#js-gallery a',
      expectedType: 'image-list',
      required: true,
    },
    city: {
      selector: '.contacts .row span:contains("Ciudad:"), .contacts .row span:contains("City:")',
      expectedType: 'exists',
      required: false,
    },
    cityFallback: {
      selector:
        '.params div:contains("Lugar:") strong a, .params div:contains("Location:") strong a',
      expectedType: 'exists',
      required: false,
    },
    country: {
      selector: '.contacts .row span:contains("País:"), .contacts .row span:contains("Country:")',
      expectedType: 'exists',
      required: false,
    },
    zone: {
      selector: '.params div:contains("City part:") strong',
      expectedType: 'text',
      required: false,
    },
    rates: {
      selector: '.rates table tbody tr',
      expectedType: 'exists',
      required: false,
    },
    services: {
      selector: '.services table tbody tr',
      expectedType: 'exists',
      required: false,
    },
    reviews: {
      selector: '.reviews #reviews-content .item',
      expectedType: 'exists',
      required: false,
    },
    ageGate: {
      selector: '#js-over18 .js-success',
      expectedType: 'exists',
      required: false,
    },
    phoneBtn: {
      selector: '.js-phone',
      expectedType: 'exists',
      required: false,
    },
    whatsappIcon: {
      selector: 'i.icon-whatsapp',
      expectedType: 'exists',
      required: false,
    },
    whatsapp: {
      selector: 'a[href*="wa.me"]',
      expectedType: 'exists',
      required: false,
    },
    phone: {
      selector: 'a.js-phone[href^="tel:"]',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('eurogirlsescort.es') || url.includes('eurogirlsescort.com');
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    // URL formats:
    // https://www.domain.es/category/name/430899/
    // https://www.domain.com/category/name/962457/?list=RANDOM
    const urlWithoutQuery = url.split('?')[0] ?? '';
    const parts = urlWithoutQuery.split('/').filter(Boolean);
    return parts.pop() || url;
  }

  protected override extractNickname(_$: CheerioAPI, url: string): string | undefined {
    // URL format: /escort/{country}/{city}/{nickname}/{id}/
    const urlWithoutQuery = url.split('?')[0] ?? '';
    const parts = urlWithoutQuery.split('/').filter(Boolean);
    // nickname is the second to last part
    if (parts.length >= 4) {
      return parts[parts.length - 2];
    }
    return undefined;
  }

  override isProfileUrl(url: string): boolean {
    return url.includes('/escort/') && !url.includes('?list=');
  }

  override extractNextPageUrl(_html: string, baseUrl: string): string | undefined {
    const listUrl = new URL(baseUrl);
    const currentPage = parseInt(listUrl.searchParams.get('profile-paginator-page') || '1', 10);
    listUrl.searchParams.set('profile-paginator-page', (currentPage + 1).toString());
    return listUrl.toString();
  }

  protected extractTitle($: CheerioAPI): string {
    return $(this.selectors.title.selector).text().trim().replace(/\s+/g, ' ');
  }

  protected extractDescription($: CheerioAPI): string {
    return $(this.selectors.description.selector).text().trim();
  }

  protected override extractCity($: CheerioAPI): string | undefined {
    const fromContacts = $(this.selectors.city.selector).first().next('strong').text().trim();
    if (fromContacts) return fromContacts;
    return (
      $(this.selectors.cityFallback.selector).first().text().trim().replace(/\s+/g, ' ') ||
      undefined
    );
  }

  protected override extractCountry($: CheerioAPI): string | undefined {
    const fromContacts = $(this.selectors.country.selector).first().next('strong').text().trim();
    if (fromContacts) return resolveCountryCode(fromContacts);
    const fromParams = $(this.selectors.cityFallback.selector)
      .eq(1)
      .text()
      .trim()
      .replace(/\s+/g, ' ');
    return fromParams ? resolveCountryCode(fromParams) : undefined;
  }

  protected override extractZone($: CheerioAPI): string | undefined {
    return $(this.selectors.zone.selector).text().trim().replace(/\s+/g, ' ') || undefined;
  }

  protected override async onBeforeCapture(
    page: any,
    options?: { skipInteractions?: boolean },
  ): Promise<void> {
    try {
      const enterBtn = page.locator(this.selectors.ageGate.selector).first();
      if (await enterBtn.isVisible({ timeout: 2000 })) {
        await enterBtn.click();
        await page.waitForTimeout(500);
      }
    } catch {
      // Ignorar
    }

    try {
      if (!options?.skipInteractions) {
        const phoneBtn = page.locator(this.selectors.phoneBtn.selector).first();
        if (await phoneBtn.isVisible({ timeout: 3000 })) {
          await phoneBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    } catch {
      // Ignorar
    }
  }

  protected extractRates($: CheerioAPI): EscortRate[] {
    const rates: EscortRate[] = [];
    $(this.selectors.rates.selector).each((_, el) => {
      const duration = $(el).find('th').text().trim();
      if (!duration) return;
      const parsePrice = (cell: ReturnType<typeof $>): number | undefined => {
        if (cell.find('i.icon-close').length > 0) return undefined;
        const text = cell.text().trim().replace(/\s+/g, '');
        const m = text.match(/(\d+)/);
        return m ? parseInt(m[1]!, 10) : undefined;
      };
      rates.push({
        duration,
        incall: parsePrice($(el).find('td').eq(0)),
        outcall: parsePrice($(el).find('td').eq(1)),
      });
    });
    return rates;
  }

  protected extractServices($: CheerioAPI): EscortService[] {
    const services: EscortService[] = [];
    $(this.selectors.services.selector).each((_, el) => {
      const name = $(el).find('th').text().trim();
      if (!name) return;
      services.push({
        name,
        included: $(el).find('td').eq(0).find('i.icon-check').length > 0,
        extra: $(el).find('td').eq(1).find('i.icon-check').length > 0,
      });
    });
    return services;
  }

  protected override extractWhatsapp($: CheerioAPI): string | undefined {
    const href =
      $(this.selectors.whatsappIcon.selector).closest('a').attr('href') ??
      $(this.selectors.whatsapp.selector).attr('href');

    if (href) {
      const m = href.match(/wa\.me\/(\d+)/);
      if (m) return `+${m[1]!}`;
    }

    if ($(this.selectors.whatsappIcon.selector).length > 0) {
      const phoneHref = $(this.selectors.phone.selector).attr('href');
      if (phoneHref) return phoneHref.replace('tel:', '');
    }
    return undefined;
  }

  protected override extractReviews($: CheerioAPI): EscortReview[] {
    const reviews: EscortReview[] = [];
    $(this.selectors.reviews.selector).each((_, el) => {
      const author = $(el).find('h3 strong').text().trim();
      if (!author) return;
      const date = $(el).find('h3 span').first().text().trim();
      const rating = $(el).find('h3 .stars i.full').length;
      const text = $(el).find('.more-text').text().trim();
      const city =
        $(el)
          .find('.nowrap:contains("Ciudad")')
          .text()
          .replace(/Ciudad \/ País:/i, '')
          .replace(/&nbsp;/g, '')
          .trim()
          .replace(/\s+/g, ' ') || undefined;
      const appointmentDate =
        $(el)
          .find('.nowrap:contains("Fecha")')
          .text()
          .replace(/Fecha de la cita/i, '')
          .replace(/&nbsp;/g, '')
          .trim()
          .replace(/\s+/g, ' ') || undefined;
      const duration =
        $(el)
          .find('.nowrap:contains("Duración")')
          .text()
          .replace(/Duración de la cita:/i, '')
          .replace(/&nbsp;/g, '')
          .trim()
          .replace(/\s+/g, ' ') || undefined;
      reviews.push({ author, date, rating, text, city, appointmentDate, duration });
    });
    return reviews;
  }

  protected async extractPhones($: CheerioAPI): Promise<string[]> {
    const phones: string[] = [];
    const phoneText = $(this.selectors.phoneBtn.selector).text().trim();
    if (phoneText && !phoneText.includes('Mostrar')) {
      phones.push(phoneText);
    }
    return phones;
  }
}
