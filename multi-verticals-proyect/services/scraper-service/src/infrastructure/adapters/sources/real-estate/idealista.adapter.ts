import type { CheerioAPI } from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/domain';

import { RealEstateBaseAdapter } from './real-estate.base.js';

export class IdealistaAdapter extends RealEstateBaseAdapter {
  readonly identifier = 'idealista';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  canHandle(url: string): boolean {
    return url.includes('idealista.com');
  }

  protected extractId(url: string): string {
    const match = url.match(/\/(inmueble|pro|motor)\/(\d+)/);
    return match && match[2] ? match[2] : url.split('/').pop() || url;
  }

  protected extractTitle($: CheerioAPI): string {
    return $('.main-info__title-main').text().trim();
  }

  protected extractDescription($: CheerioAPI): string {
    return $('.adCommentsLanguageSelector').text().trim();
  }

  protected extractAddress($: CheerioAPI): string {
    return $('.main-info__title-minor').text().trim();
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

  protected getImageSelectors(): string[] {
    return ['#main-multimedia img'];
  }

  protected extractRawPrice($: CheerioAPI): string {
    return $('.info-data-price').text().trim();
  }

  protected async extractPhones($: CheerioAPI): Promise<string[]> {
    const phones: string[] = [];
    const phoneText = $('.phone-number, .contact-phone').text().trim();
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
