import type { CheerioAPI } from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/domain';

import type { SelectorDef } from '../base-source.adapter.js';
import { MotorBaseAdapter } from './motor.base.js';

export class CochesNetAdapter extends MotorBaseAdapter {
  readonly identifier = 'coches-net';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors: Record<string, SelectorDef> = {
    title: { selector: 'h1', expectedType: 'text', required: true },
    description: { selector: '.mt-Description', expectedType: 'text', required: false },
    address: { selector: '.mt-Location', expectedType: 'text', required: false },
    gallery: { selector: '.mt-Gallery img', expectedType: 'image-list', required: true },
    price: { selector: '.mt-Price', expectedType: 'text', required: false },
  };

  canHandle(url: string): boolean {
    return url.includes('coches.net');
  }

  protected extractId(url: string): string {
    return url.split('/').pop() || url;
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

  protected extractRawPrice($: CheerioAPI): string {
    return $(this.selectors['price']!.selector).text().trim();
  }

  protected extractYear($: CheerioAPI): number | undefined {
    return undefined;
  }
  protected extractKilometers($: CheerioAPI): number | undefined {
    return undefined;
  }
  protected extractFuel($: CheerioAPI): string | undefined {
    return undefined;
  }
  protected extractTransmission($: CheerioAPI): string | undefined {
    return undefined;
  }
  protected extractPower($: CheerioAPI): number | undefined {
    return undefined;
  }
}
