import type { CheerioAPI } from 'cheerio';

import type { CurrencyCode } from '@allcoba/shared-types';

import type { SelectorDef } from '../base-source.adapter.js';
import { RealEstateBaseAdapter } from './real-estate.base.js';

export class FotocasaAdapter extends RealEstateBaseAdapter {
  readonly identifier = 'fotocasa';
  readonly defaultCountry = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors: Record<string, SelectorDef> = {
    title: { selector: 'h1', expectedType: 'text', required: true },
    description: {
      selector: '.re-DetailDescription-text, [class*="Description"]',
      expectedType: 'text',
      required: false,
    },
    address: {
      selector: '.re-DetailMap-address, [class*="Map-address"]',
      expectedType: 'text',
      required: false,
    },
    gallery: {
      selector: '[data-testid="mosaic-section"] picture',
      expectedType: 'image-list',
      required: true,
    },
    phone: {
      selector: '[data-testid="view-phone-button"] strong, [href^="tel:"]',
      expectedType: 'exists',
      required: false,
    },
    price: {
      selector: '.re-DetailHeader-price, .re-DetailHeader-price--primary',
      expectedType: 'text',
      required: false,
    },
  };

  canHandle(url: string): boolean {
    return url.includes('fotocasa.es');
  }

  protected extractId(url: string): string {
    const match = url.match(/\/(\d+)(\/|#|\?|$)/);
    return match && match[1] ? match[1]! : url.split('/').pop() || 'unknown';
  }

  protected extractTitle($: CheerioAPI): string {
    return $(this.selectors['title']!.selector).first().text().trim();
  }

  protected extractDescription($: CheerioAPI): string {
    return $(this.selectors['description']!.selector).text().trim();
  }

  protected override extractAddress($: CheerioAPI): string | undefined {
    return $(this.selectors['address']!.selector).text().trim() || undefined;
  }

  protected getCookieSelectors(): string[] {
    return ['#didomi-notice-agree-button'];
  }

  protected async onBeforeCapture(page: any): Promise<void> {
    try {
      const contactBtn = page
        .locator(
          '[data-testid="view-phone-button"], button:has-text("Llamar"), button:has-text("Ver teléfono")',
        )
        .first();
      if (await contactBtn.isVisible({ timeout: 3000 })) {
        await contactBtn.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      // No pasa nada si no hay botón
    }
  }

  protected extractRawPrice($: CheerioAPI): string {
    return $(this.selectors['price']!.selector).first().text().trim();
  }

  protected async extractPhones($: CheerioAPI): Promise<string[]> {
    const phones: string[] = [];
    const phoneText = $(this.selectors['phone']!.selector).first().text().trim();
    if (phoneText) {
      phones.push(phoneText.replace(/\s/g, ''));
    }
    return phones;
  }

  protected extractRooms($: CheerioAPI): number | undefined {
    const element = $(
      '.re-DetailHeader-rooms, .re-DetailHeader-featuresItem:contains("hab")',
    ).first();
    const text = element.text();
    const match = text.match(/(\d+)/);
    if (match && match[1]) return parseInt(match[1], 10);

    const description = this.extractDescription($);
    return description
      ? this.parseFromText(description, [/(\d+)\s*hab/i, /(\d+)\s*dormitorio/i, /(\d+)\s*studi/i])
      : undefined;
  }

  protected extractBathrooms($: CheerioAPI): number | undefined {
    const element = $(
      '.re-DetailHeader-bathrooms, .re-DetailHeader-featuresItem:contains("baño")',
    ).first();
    const text = element.text();
    const match = text.match(/(\d+)/);
    if (match && match[1]) return parseInt(match[1], 10);

    const description = this.extractDescription($);
    return description
      ? this.parseFromText(description, [/(\d+)\s*baño/i, /(\d+)\s*aseo/i])
      : undefined;
  }

  protected extractSurface($: CheerioAPI): number | undefined {
    const element = $(
      '.re-DetailHeader-surface, .re-DetailHeader-featuresItem:contains("m²")',
    ).first();
    const text = element.text();
    const match = text.match(/(\d+)/);
    if (match && match[1]) return parseInt(match[1], 10);

    const description = this.extractDescription($);
    return description
      ? this.parseFromText(description, [/(\d+)\s*m²/i, /(\d+)\s*metros/i])
      : undefined;
  }

  protected extractHasAscensor($: CheerioAPI): boolean | undefined {
    const hasAscensor = $('[aria-label*="ascensor"], [aria-labelledby*="elevator"]').length > 0;
    if (hasAscensor) return true;
    const allFeatures = $('[aria-label], [aria-labelledby]').text().toLowerCase();
    return allFeatures.includes('ascensor') ? true : undefined;
  }

  protected extractAttributes($: CheerioAPI): any {
    return {
      rooms: this.extractRooms($),
      bathrooms: this.extractBathrooms($),
      surface: this.extractSurface($),
      hasAscensor: this.extractHasAscensor($),
      rawFeatures: this.collectRawFeatures(
        $,
        '.re-DetailFeaturesList-feature, .re-ContentDetail-featuresListWrapper li',
      ),
    };
  }

  getCrawlerOptions(url: string, options?: { skipInteractions?: boolean }): any {
    return {
      ...super.getCrawlerOptions(url, options),
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    };
  }

  protected override extractAdditionalImageUrls($: CheerioAPI): string[] {
    // Fotocasa embeds all listing images (rule=original, full quality) in window.__INITIAL_DATA__
    // The mosaic section shows only 5; the JSON has every photo without any modal click.
    const scriptText =
      $('script')
        .filter((_, el) => ($(el).html() ?? '').includes('__INITIAL_DATA__'))
        .html() ?? '';

    const matches = scriptText.matchAll(
      /https:\/\/static\.fotocasa\.es\/images\/ads\/[^"\\]+\?rule=original/g,
    );
    return [...new Set([...matches].map((m) => m[0]))];
  }
}
