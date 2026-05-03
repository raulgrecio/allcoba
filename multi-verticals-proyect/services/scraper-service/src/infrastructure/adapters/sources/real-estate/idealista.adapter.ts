import { RealEstateBaseAdapter } from './real-estate.base.js';
import type { CheerioAPI } from 'cheerio';

export class IdealistaAdapter extends RealEstateBaseAdapter {
  readonly identifier = 'idealista';

  canHandle(url: string): boolean {
    return url.includes('idealista.com');
  }

  protected extractId(url: string): string {
    const match = url.match(/\/(inmueble|pro|motor)\/(\d+)/);
    return match ? match[2] : url.split('/').pop() || url;
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

  protected getImageSelectors(): string[] {
    return ['#main-multimedia img'];
  }

  protected extractRawPrice($: CheerioAPI): string {
    return $('.info-data-price').text().trim();
  }

  protected extractRooms($: CheerioAPI): number | undefined { return undefined; }
  protected extractBathrooms($: CheerioAPI): number | undefined { return undefined; }
  protected extractSurface($: CheerioAPI): number | undefined { return undefined; }
  protected extractHasAscensor($: CheerioAPI): boolean | undefined { return undefined; }
}
