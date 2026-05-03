import { RealEstateBaseAdapter } from './real-estate.base.js';
import type { CheerioAPI } from 'cheerio';

export class FotocasaAdapter extends RealEstateBaseAdapter {
  readonly identifier = 'fotocasa';

  canHandle(url: string): boolean {
    return url.includes('fotocasa.es');
  }

  protected extractId(url: string): string {
    const match = url.match(/\/(\d+)(\/|#|\?|$)/);
    return match ? match[1]! : url.split('/').pop() || 'unknown';
  }

  protected extractTitle($: CheerioAPI): string {
    return $('h1').first().text().trim();
  }

  protected extractDescription($: CheerioAPI): string {
    return $('.re-DetailDescription-text, [class*="Description"]').text().trim();
  }

  protected extractAddress($: CheerioAPI): string {
    return $('.re-DetailMap-address, [class*="Map-address"]').text().trim();
  }

  protected getImageSelectors(): string[] {
    return [
      '.re-DetailPhotos-image',
      '.re-DetailMultimedia-image',
      '.re-DetailMultimedia-slider img',
      'img[src*="fotocasa.es/images"]'
    ];
  }

  protected extractRawPrice($: CheerioAPI): string {
    return $('.re-DetailHeader-price, .re-DetailHeader-price--primary').first().text().trim();
  }

  protected extractRooms($: CheerioAPI): number | undefined { return undefined; }
  protected extractBathrooms($: CheerioAPI): number | undefined { return undefined; }
  protected extractSurface($: CheerioAPI): number | undefined { return undefined; }
  protected extractHasAscensor($: CheerioAPI): boolean | undefined { return undefined; }
}
