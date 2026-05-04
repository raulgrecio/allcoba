import type { CheerioAPI } from 'cheerio';

import { Vertical } from '../../../../domain/entities/vertical.js';
import { BaseSourceAdapter } from '../base-source.adapter.js';

export abstract class RealEstateBaseAdapter extends BaseSourceAdapter {
  readonly defaultVertical = Vertical.REAL_ESTATE;

  /**
   * Implementación universal del precio para Inmobiliaria
   */
  protected extractPrice($: CheerioAPI): number | undefined {
    return this.parsePrice(this.extractRawPrice($));
  }

  /**
   * Atributos específicos que NO están en la base
   */
  protected extractAttributes($: CheerioAPI): any {
    return {
      rooms: this.extractRooms($),
      bathrooms: this.extractBathrooms($),
      surface: this.extractSurface($),
      hasAscensor: this.extractHasAscensor($),
    };
  }

  protected abstract extractRawPrice($: CheerioAPI): string;
  protected abstract extractRooms($: CheerioAPI): number | undefined;
  protected abstract extractBathrooms($: CheerioAPI): number | undefined;
  protected abstract extractSurface($: CheerioAPI): number | undefined;
  protected abstract extractHasAscensor($: CheerioAPI): boolean | undefined;

  protected parsePrice(priceText: string): number | undefined {
    const numeric = priceText.replace(/[^0-9]/g, '');
    return numeric ? parseInt(numeric, 10) : undefined;
  }
}
