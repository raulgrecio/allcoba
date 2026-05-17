import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/domain';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name Nuevoloquo
 * @domain nuevoloquo.ch · nuevoloquo.com · nuevoloquo.es
 * @technology Unknown
 * @protection None
 * @ui_interactors Age gate, Cookies // PENDIENTE: SOLO VI EL POPUP DE EDAD NO LA COOKIES
 * @auth None
 * @url_listing /escort/{province}/{city}/
 * @url_detail /escort/{province}/{slug}/{id}/
 * @extraction_method Playwright (teléfono ofuscado en HTML estático, requiere click)
 */
export class NuevoloquoAdapter extends DatingBaseAdapter {
  readonly identifier = 'nuevoloquo';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: 'h2.public-title',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: '#description-container p',
      expectedType: 'text',
      required: false,
    },
    gallery: {
      selector: '#carousel-img .carousel-item img',
      expectedType: 'image-list',
      required: false,
    },
    location: {
      selector: '.card-zone .location a',
      expectedType: 'text',
      required: false,
    },
    detailsBox: {
      selector: '.details-box',
      expectedType: 'exists',
      required: false,
    },
    verifiedBadge: {
      selector: '.verified-badge, span.material-symbols-outlined:contains("verified_user")',
      expectedType: 'exists',
      required: false,
    },
    details: {
      selector: '.card.details',
      expectedType: 'exists',
      required: true,
    },
    fallbackNickname: {
      selector: 'h1.ad-name',
      expectedType: 'text',
      required: false,
    },
    galleryVideo: {
      selector: '#galleryVideo video',
      expectedType: 'exists',
      required: false,
    },
    nextPage: {
      selector: 'a[rel="next"], .page-link[aria-label="Next"], a.next',
      expectedType: 'exists',
      required: false,
    },
    cookies: {
      selector:
        '.cc-accept-all-btn, button.accept-cookies, [data-cc="accept-all"], button.btn-accept',
      expectedType: 'exists',
      required: false,
    },
    ageGate: {
      selector: '#show-more',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return /nuevoloquo\.(ch|com|es)/.test(url);
  }

  isProfileUrl(url: string): boolean {
    // /escort/{province}/{slug}/{id}/
    return /\/escort\/[^/]+\/[^/]+\/\d+\/?$/.test(url);
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    const m = url.match(/\/(\d+)\/?$/);
    return m ? m[1]! : url;
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    return (
      $(this.selectors.title.selector).text().trim() ||
      $(this.selectors.fallbackNickname.selector).text().trim() ||
      undefined
    );
  }

  protected extractTitle($: CheerioAPI): string {
    return (
      $(this.selectors.title.selector).text().trim() ||
      $(this.selectors.fallbackNickname.selector).text().trim() ||
      ''
    );
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

  // nuevoloquo uses .details-box > span.legend + span (sibling)
  private extractDetailField($: CheerioAPI, label: string): string | undefined {
    const boxes = $(this.selectors.detailsBox.selector);
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes.eq(i);
      if (box.find('span.legend').text().trim() === label) {
        return box.find('span:not(.legend)').first().text().trim() || undefined;
      }
    }
    return undefined;
  }

  protected override extractCity($: CheerioAPI): string | undefined {
    // .card-zone .location: "Valdemoro (Madrid)"
    return $(this.selectors.location.selector).first().text().trim() || undefined;
  }

  protected override extractZone($: CheerioAPI): string | undefined {
    // Province link text
    return (
      $(this.selectors.location.selector).first().text().replace(/[()]/g, '').trim() || undefined
    );
  }

  // Phone is obfuscated in static HTML — requires Playwright to reveal via JS
  protected override async extractPhones(_$: CheerioAPI): Promise<string[]> {
    return [];
  }

  protected override async onBeforeCapture(page: any): Promise<void> {
    // Reveal phone: click the "Ver teléfonos" toggle (visible only on mobile,
    // but on desktop the list is collapsed too via JS). Trigger the AJAX reveal.
    try {
      const btn = page.locator(this.selectors.ageGate.selector);
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(1500);
      }
    } catch {
      /* not blocking */
    }
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);
    const gender = this.extractDetailField($, 'Género');
    const age = this.parseFirstInt(this.extractDetailField($, 'Edad'));
    const ethnicity = this.extractDetailField($, 'Etnia');
    const hairColor = this.extractDetailField($, 'Color de pelo');
    const weightKg = this.parseFirstInt(this.extractDetailField($, 'Peso'));
    const heightCm = this.parseFirstInt(this.extractDetailField($, 'Altura'));
    const measurements = this.extractDetailField($, 'Medidas (cm)');
    const serviceType = this.extractDetailField($, 'Disponible para');
    const languages = this.extractDetailField($, 'Idiomas')
      ?.split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    // Verified: platform badge in profile page
    const verified = $(this.selectors.verifiedBadge.selector).length > 0;

    // Video available
    const videoAvailable =
      $(DatingBaseAdapter.baseSelectors.videoTag.selector).length > 0 ||
      $(this.selectors.galleryVideo.selector).length > 0;

    const badges: string[] = [];
    if (verified) badges.push('verified');
    if (videoAvailable) badges.push('video');

    return {
      ...base,
      gender: gender ?? base.gender,
      age: age ?? base.age,
      ethnicity: ethnicity ?? base.ethnicity,
      hairColor: hairColor ?? base.hairColor,
      weightKg: weightKg ?? base.weightKg,
      heightCm: heightCm ?? base.heightCm,
      measurements: measurements ?? base.measurements,
      serviceType: serviceType ?? base.serviceType,
      languages: languages ?? base.languages,
      verified: verified || base.verified,
      videoAvailable: videoAvailable || base.videoAvailable,
      independent: true,
      badges,
      rates: [],
      services: [],
      reviews: [],
    };
  }

  extractNextPageUrl(html: string, baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    // Try rel="next" or page-link[aria-label="Next"]
    const next = $(this.selectors.nextPage.selector).attr('href');
    if (next) {
      try {
        return new URL(next, baseUrl).toString();
      } catch {
        /* ignore */
      }
    }
    // Try current page number + 1 from URL pattern
    const pageMatch = baseUrl.match(/[?&]page=(\d+)/);
    const page = pageMatch ? parseInt(pageMatch[1]!, 10) + 1 : 2;
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl.split('?')[0]}${separator}page=${page}`;
  }
}
