import type { CheerioAPI } from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/domain';

import type { SelectorDef } from '../base-source.adapter.js';
import { RealEstateBaseAdapter } from './real-estate.base.js';

export class IdealistaAdapter extends RealEstateBaseAdapter {
  readonly identifier = 'idealista';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors: Record<string, SelectorDef> = {
    title: { selector: '.main-info__title-main', expectedType: 'text', required: true },
    description: { selector: '.adCommentsLanguageSelector', expectedType: 'text', required: false },
    address: { selector: '.main-info__title-minor', expectedType: 'text', required: false },
    gallery: { selector: '#main-multimedia img', expectedType: 'image-list', required: true },
    price: { selector: '.info-data-price', expectedType: 'text', required: false },
    phone: { selector: '.phone-number, .contact-phone', expectedType: 'exists', required: false },
  };

  canHandle(url: string): boolean {
    return url.includes('idealista.com');
  }

  protected extractId(url: string): string {
    const match = url.match(/\/(inmueble|pro|motor)\/(\d+)/);
    return match && match[2] ? match[2] : url.split('/').pop() || url;
  }

  protected extractTitle($: CheerioAPI): string {
    return $(this.selectors['title']!.selector).text().trim();
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
      const phoneBtn = page.locator('button:has-text("Ver teléfono")').first();
      if (await phoneBtn.isVisible({ timeout: 3000 })) {
        await phoneBtn.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // No pasa nada
    }
  }

  protected extractRawPrice($: CheerioAPI): string {
    return $(this.selectors['price']!.selector).text().trim();
  }

  protected async extractPhones($: CheerioAPI): Promise<string[]> {
    const phones: string[] = [];
    const phoneText = $(this.selectors['phone']!.selector).text().trim();
    if (phoneText) {
      phones.push(phoneText.replace(/\s/g, ''));
    }
    return phones;
  }

  protected extractRooms($: CheerioAPI): number | undefined {
    return undefined;
  }
  protected extractBathrooms($: CheerioAPI): number | undefined {
    return undefined;
  }
  protected extractSurface($: CheerioAPI): number | undefined {
    return undefined;
  }
  protected extractHasAscensor($: CheerioAPI): boolean | undefined {
    return undefined;
  }
}
