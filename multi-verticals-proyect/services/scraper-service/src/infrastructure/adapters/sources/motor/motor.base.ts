import type { CheerioAPI } from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/legacy-domain';



import { BaseSourceAdapter } from '../base-source.adapter.js';

export abstract class MotorBaseAdapter extends BaseSourceAdapter {
  readonly defaultVertical = 'motor' as const;

  /**
   * Implementación universal del precio para Motor
   */
  protected extractPrice($: CheerioAPI): number | undefined {
    return this.parsePrice(this.extractRawPrice($));
  }

  protected extractAttributes($: CheerioAPI): any {
    return {
      year: this.extractYear($),
      kilometers: this.extractKilometers($),
      fuel: this.extractFuel($),
      transmission: this.extractTransmission($),
      power: this.extractPower($),
    };
  }

  protected abstract extractRawPrice($: CheerioAPI): string;
  protected abstract extractYear($: CheerioAPI): number | undefined;
  protected abstract extractKilometers($: CheerioAPI): number | undefined;
  protected abstract extractFuel($: CheerioAPI): string | undefined;
  protected abstract extractTransmission($: CheerioAPI): string | undefined;
  protected abstract extractPower($: CheerioAPI): number | undefined;

  protected parsePrice(priceText: string): number | undefined {
    const numeric = priceText.replace(/[^0-9]/g, '');
    return numeric ? parseInt(numeric, 10) : undefined;
  }
}
