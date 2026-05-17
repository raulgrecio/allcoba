import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CurrencyCode } from '@allcoba/shared-types';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { parseTelegramHref, parseWhatsappHref } from '../social-extractor.js';
import { SERVICE_LOCATION_KEYWORDS } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name Chicasmalas
 * @domain chicasmalas.es
 * @technology WordPress / Elementor (#cmFichaV9)
 * @protection None
 * @ui_interactors Age gate, Cookies
 * @auth None
 * @url_listing /escorts/{city}/
 * @url_detail /escorts/{city}/{slug}
 * @extraction_method Playwright + Cheerio
 */
export class ChicasmalasAdapter extends DatingBaseAdapter {
  readonly identifier = 'chicasmalas';
  readonly defaultCountry = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors = {
    title: {
      selector: '#cmFichaV9 h2',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: '#cmFichaV9 .cm-v9-desc',
      expectedType: 'text',
      required: false,
    },
    gallery: {
      selector: '#cmFichaV9 .cm-v9-thumbs .cm-v9-thumb img',
      expectedType: 'image-list',
      required: false,
    },
    phone: {
      selector: '#cmFichaV9 a[href^="tel:"]',
      expectedType: 'exists',
      required: false,
    },
    whatsapp: {
      selector: '#cmFichaV9 .cm-v9-cta a.cm-v9-btn-wa',
      expectedType: 'exists',
      required: false,
    },
    telegram: {
      selector: '#cmFichaV9 .cm-v9-cta a.cm-v9-btn-tg',
      expectedType: 'exists',
      required: false,
    },
    chips: {
      selector: '#cmFichaV9 .cm-v9-chip',
      expectedType: 'exists',
      required: false,
    },
    rows: {
      selector: '#cmFichaV9 .cm-v9-row',
      expectedType: 'exists',
      required: false,
    },
    badges: {
      selector: '#cmFichaV9 .cm-v9-badge.gold',
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
        '.wp-consent-accept-all, button.accept-all, #cookie_action_close_header, a.cli_action_button',
      expectedType: 'exists',
      required: false,
    },
    ageGate: {
      selector: '.adult-banner button, #adult-banner-accept, button:contains("Soy mayor de edad")',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('chicasmalas.es');
  }

  isProfileUrl(url: string): boolean {
    // Profile: /escorts/{city}/{slug} — 3 path segments, first is 'escorts'
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts.length === 3 && parts[0] === 'escorts' && !url.includes('?');
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    return $(this.selectors.title.selector).first().text().trim();
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 1]!;
  }

  protected extractTitle($: CheerioAPI): string {
    return $(this.selectors.title.selector).first().text().trim();
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
    // Only capture if the CTA button is not disabled (no pointer-events:none)
    const btn = $(this.selectors.whatsapp.selector).first();
    const style = btn.attr('style') ?? '';
    if (style.includes('pointer-events:none')) return undefined;
    const href = btn.attr('href');
    return href ? parseWhatsappHref(href) : undefined;
  }

  protected override extractTelegram($: CheerioAPI): string | undefined {
    // Site-level Telegram appears here disabled — only capture if enabled
    const btn = $(this.selectors.telegram.selector).first();
    const style = btn.attr('style') ?? '';
    if (style.includes('pointer-events:none')) return undefined;
    const href = btn.attr('href');
    if (!href) return undefined;
    // Skip site-level Telegram handle (all-caps = site account)
    const parsed = parseTelegramHref(href);
    if (parsed?.toUpperCase() === '@CHICASMALASES') return undefined;
    return parsed;
  }

  // Site social accounts live in header/footer — not profile-specific
  protected override extractInstagram(_$: CheerioAPI): string | undefined {
    return undefined;
  }
  protected override extractTiktok(_$: CheerioAPI): string | undefined {
    return undefined;
  }
  protected override extractTwitter(_$: CheerioAPI): string | undefined {
    return undefined;
  }

  protected override extractCity($: CheerioAPI, url?: string): string | undefined {
    const zone = this.extractCmRow($, 'Zona');
    if (zone) return zone;
    if (url) {
      const parts = new URL(url).pathname.split('/').filter(Boolean);
      // /escorts/{city}/{slug}
      if (parts[0] === 'escorts' && parts.length >= 2) {
        return parts[1]!.replace(/-/g, ' ');
      }
    }
    return undefined;
  }

  protected override extractZone($: CheerioAPI): string | undefined {
    return undefined;
  }

  protected extractRates(_$: CheerioAPI): EscortRate[] {
    return [];
  }

  protected extractServices($: CheerioAPI): EscortService[] {
    const services: EscortService[] = [];
    // Exclude .not-services (extra-info: contact channels, locations, payments)
    $(this.selectors.chips.selector).each((_, el) => {
      const name = $(el).text().trim();
      if (name && !SERVICE_LOCATION_KEYWORDS.has(name.toLowerCase())) {
        services.push({ name, included: true, extra: false });
      }
    });
    return services;
  }

  private extractServiceLocations($: CheerioAPI): string[] {
    const locs: string[] = [];
    $(this.selectors.chips.selector).each((_, el) => {
      const name = $(el).text().trim();
      if (name && SERVICE_LOCATION_KEYWORDS.has(name.toLowerCase())) locs.push(name);
    });
    return locs;
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);
    const verified = $(this.selectors.badges.selector)
      .toArray()
      .some((el) => $(el).text().trim().toLowerCase() === 'verificada');

    const serviceLocations = this.extractServiceLocations($);

    return {
      ...base,
      age: this.parseFirstInt(this.extractCmRow($, 'Edad')) ?? base.age,
      heightCm: this.parseFirstInt(this.extractCmRow($, 'Altura')) ?? base.heightCm,
      weightKg: this.parseFirstInt(this.extractCmRow($, 'Peso')) ?? base.weightKg,
      nationality: this.extractCmRow($, 'Nacionalidad') ?? base.nationality,
      independent: true,
      verified,
      rates: [],
      services: this.extractServices($),
      serviceLocations: serviceLocations.length > 0 ? serviceLocations : undefined,
    };
  }

  extractNextPageUrl(html: string, _baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    return $(this.selectors.nextPage.selector).first().attr('href') ?? undefined;
  }

  protected override async onBeforeCapture(page: any): Promise<void> {
    try {
      const selectors = this.getAgeGateSelectors();
      for (const selector of selectors) {
        const btn = page.locator(selector);
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          await page.waitForTimeout(500);
          return;
        }
      }
    } catch {
      /* no age gate visible */
    }
  }

  // Extracts value from .cm-v9-row pairs by label text.
  private extractCmRow($: CheerioAPI, label: string): string | undefined {
    let value: string | undefined;
    $(this.selectors.rows.selector).each((_, el) => {
      if (value) return;
      const spans = $(el).find('span');
      const lbl = spans.first().text().trim();
      if (lbl === label) {
        value = spans.last().text().trim() || undefined;
      }
    });
    return value;
  }
}
